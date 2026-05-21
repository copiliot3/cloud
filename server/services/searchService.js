const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const MAX_RESULTS = 200;
const MAX_DEPTH = 15;
const CACHE_TTL_MS = 30_000; // 30s
const BATCH_INTERVAL_MS = 16; // ~60fps streaming
const CONCURRENCY = 8; // max parallel readdir calls

// Hidden / system items to skip
const HIDDEN = new Set([
  '$Recycle.Bin', 'System Volume Information', '$WinREAgent', 'Recovery',
  'DumpStack.log.tmp', 'pagefile.sys', 'hiberfil.sys', 'swapfile.sys',
  'desktop.ini', 'thumbs.db', 'node_modules', '.git',
]);

// Category mapping by extension
const CATEGORY_MAP = {
  // Documents
  '.pdf': 'document', '.doc': 'document', '.docx': 'document', '.txt': 'document',
  '.rtf': 'document', '.md': 'document', '.odt': 'document',
  // Spreadsheets → document
  '.xls': 'document', '.xlsx': 'document', '.csv': 'document',
  // Presentations → document
  '.ppt': 'document', '.pptx': 'document',
  // Images
  '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
  '.svg': 'image', '.webp': 'image', '.bmp': 'image', '.ico': 'image',
  '.tiff': 'image', '.raw': 'image',
  // Video
  '.mp4': 'video', '.avi': 'video', '.mkv': 'video', '.mov': 'video',
  '.webm': 'video', '.wmv': 'video', '.flv': 'video',
  // Audio
  '.mp3': 'audio', '.wav': 'audio', '.flac': 'audio', '.aac': 'audio',
  '.ogg': 'audio', '.wma': 'audio', '.m4a': 'audio',
  // Code
  '.js': 'code', '.jsx': 'code', '.ts': 'code', '.tsx': 'code',
  '.py': 'code', '.java': 'code', '.html': 'code', '.css': 'code',
  '.json': 'code', '.xml': 'code', '.yaml': 'code', '.yml': 'code',
  '.c': 'code', '.cpp': 'code', '.h': 'code', '.cs': 'code',
  '.go': 'code', '.rs': 'code', '.rb': 'code', '.php': 'code',
  '.sql': 'code', '.sh': 'code', '.bat': 'code', '.ps1': 'code',
  // Archives
  '.zip': 'archive', '.rar': 'archive', '.7z': 'archive',
  '.tar': 'archive', '.gz': 'archive', '.bz2': 'archive',
  // Executables
  '.exe': 'executable', '.msi': 'executable', '.dll': 'executable',
  '.sys': 'executable',
};

// ---------------------------------------------------------------------------
// IN-MEMORY DIRECTORY CACHE
// ---------------------------------------------------------------------------
const dirCache = new Map();

function getCachedDir(dirPath) {
  const entry = dirCache.get(dirPath);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data;
  return null;
}

function setCachedDir(dirPath, data) {
  dirCache.set(dirPath, { data, ts: Date.now() });
  // Evict old entries if cache grows too large
  if (dirCache.size > 5000) {
    const cutoff = Date.now() - CACHE_TTL_MS;
    for (const [key, val] of dirCache) {
      if (val.ts < cutoff) dirCache.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// SCORING & MATCHING
// ---------------------------------------------------------------------------
function getCategory(entry) {
  if (entry.isDirectory()) return 'folder';
  const ext = path.extname(entry.name).toLowerCase();
  return CATEGORY_MAP[ext] || 'other';
}

function scoreMatch(name, query) {
  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Exact match
  if (lowerName === lowerQuery) return 100;

  // Starts with
  if (lowerName.startsWith(lowerQuery)) return 90;

  // Name without extension starts with
  const baseName = lowerName.replace(/\.[^.]+$/, '');
  if (baseName.startsWith(lowerQuery)) return 85;

  // Contains as contiguous substring
  const idx = lowerName.indexOf(lowerQuery);
  if (idx !== -1) {
    // Higher score for matches closer to the start
    return 70 - Math.min(idx, 20);
  }

  // Word-boundary match (e.g., "pkg" matches "package")
  if (fuzzyMatch(lowerName, lowerQuery)) return 40;

  return 0;
}

function fuzzyMatch(text, pattern) {
  let ti = 0;
  let pi = 0;
  while (ti < text.length && pi < pattern.length) {
    if (text[ti] === pattern[pi]) pi++;
    ti++;
  }
  return pi === pattern.length;
}

// ---------------------------------------------------------------------------
// PARALLEL DIRECTORY WALKER
// ---------------------------------------------------------------------------

/**
 * Stream search results via a callback. Walks directories in parallel.
 * @param {string} rootPath - Root directory to search
 * @param {string} query - Search query
 * @param {function} onResults - Callback receiving batches of results
 * @param {function} onDone - Callback when search completes
 * @param {AbortSignal} signal - AbortSignal to cancel the search
 */
async function streamSearch(rootPath, query, onResults, onDone, signal) {
  const normalizedRoot = path.resolve(rootPath);
  const lowerQuery = query.toLowerCase();
  const startTime = Date.now();

  let totalResults = 0;
  let batch = [];
  let batchTimer = null;
  let aborted = false;

  if (signal) {
    signal.addEventListener('abort', () => { aborted = true; });
  }

  function flushBatch() {
    if (batch.length > 0) {
      const toSend = batch;
      batch = [];
      onResults(toSend);
    }
  }

  function addResult(result) {
    if (totalResults >= MAX_RESULTS || aborted) return false;
    batch.push(result);
    totalResults++;

    // Auto-flush batch periodically
    if (!batchTimer) {
      batchTimer = setTimeout(() => {
        batchTimer = null;
        flushBatch();
      }, BATCH_INTERVAL_MS);
    }

    return totalResults < MAX_RESULTS;
  }

  // Semaphore for concurrency control
  let activeCount = 0;
  const queue = [];

  function runNext() {
    while (activeCount < CONCURRENCY && queue.length > 0) {
      const task = queue.shift();
      activeCount++;
      task().finally(() => {
        activeCount--;
        runNext();
      });
    }
  }

  function enqueue(task) {
    queue.push(task);
    runNext();
  }

  // Track pending work
  let pendingDirs = 0;
  let resolveAllDone;
  const allDonePromise = new Promise(resolve => { resolveAllDone = resolve; });

  function checkDone() {
    if (pendingDirs === 0) {
      resolveAllDone();
    }
  }

  async function processDir(dirPath, depth) {
    if (depth > MAX_DEPTH || totalResults >= MAX_RESULTS || aborted) {
      pendingDirs--;
      checkDone();
      return;
    }

    try {
      // Try cache first
      let entries = getCachedDir(dirPath);
      if (!entries) {
        entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
        setCachedDir(dirPath, entries);
      }

      const subdirs = [];

      for (const entry of entries) {
        if (aborted || totalResults >= MAX_RESULTS) break;
        if (HIDDEN.has(entry.name) || entry.name.startsWith('$') || entry.name.startsWith('.')) continue;

        const score = scoreMatch(entry.name, query);
        if (score > 0) {
          const fullPath = path.join(dirPath, entry.name);
          try {
            const stats = await fsPromises.stat(fullPath);
            const result = {
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory(),
              size: entry.isDirectory() ? null : stats.size,
              modified: stats.mtime.toISOString(),
              extension: entry.isDirectory() ? null : path.extname(entry.name).toLowerCase(),
              category: getCategory(entry),
              score,
              depth,
            };
            if (!addResult(result)) break;
          } catch { /* skip inaccessible */ }
        }

        if (entry.isDirectory()) {
          subdirs.push(path.join(dirPath, entry.name));
        }
      }

      // Enqueue subdirectories for parallel processing
      for (const subdir of subdirs) {
        if (totalResults >= MAX_RESULTS || aborted) break;
        pendingDirs++;
        enqueue(() => processDir(subdir, depth + 1));
      }

    } catch { /* skip inaccessible dirs */ }

    pendingDirs--;
    checkDone();
  }

  // Start from root
  pendingDirs++;
  enqueue(() => processDir(normalizedRoot, 0));

  // Wait for all directories to be processed
  await allDonePromise;

  // Flush remaining batch
  if (batchTimer) clearTimeout(batchTimer);
  flushBatch();

  const elapsed = Date.now() - startTime;
  onDone({ totalResults, elapsed, query, root: normalizedRoot });
}

/**
 * Quick synchronous-style search (non-streaming) for smaller scopes.
 */
async function quickSearch(rootPath, query, maxResults = 50) {
  const normalizedRoot = path.resolve(rootPath);
  const results = [];
  const startTime = Date.now();

  async function walk(dirPath, depth) {
    if (depth > MAX_DEPTH || results.length >= maxResults) return;

    try {
      let entries = getCachedDir(dirPath);
      if (!entries) {
        entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
        setCachedDir(dirPath, entries);
      }

      const subdirPromises = [];

      for (const entry of entries) {
        if (results.length >= maxResults) break;
        if (HIDDEN.has(entry.name) || entry.name.startsWith('$') || entry.name.startsWith('.')) continue;

        const score = scoreMatch(entry.name, query);
        if (score > 0) {
          const fullPath = path.join(dirPath, entry.name);
          try {
            const stats = await fsPromises.stat(fullPath);
            results.push({
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory(),
              size: entry.isDirectory() ? null : stats.size,
              modified: stats.mtime.toISOString(),
              extension: entry.isDirectory() ? null : path.extname(entry.name).toLowerCase(),
              category: getCategory(entry),
              score,
              depth,
            });
          } catch { /* skip */ }
        }

        if (entry.isDirectory()) {
          subdirPromises.push(walk(path.join(dirPath, entry.name), depth + 1));
        }
      }

      await Promise.allSettled(subdirPromises);
    } catch { /* skip */ }
  }

  await walk(normalizedRoot, 0);

  // Sort by score descending, then by depth ascending (shallower = more relevant)
  results.sort((a, b) => b.score - a.score || a.depth - b.depth);

  return {
    query,
    root: normalizedRoot,
    results: results.slice(0, maxResults),
    elapsed: Date.now() - startTime,
    totalResults: results.length,
  };
}

module.exports = { streamSearch, quickSearch };
