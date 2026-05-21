const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const starService = require('./starService');
const recycleBinService = require('./recycleBinService');

async function safeMkdir(dir, options) {
  const resolved = path.resolve(dir);
  if (path.parse(resolved).root === resolved) {
    return;
  }
  await fsPromises.mkdir(dir, options);
}


// Hidden/system items to filter out
const HIDDEN_ITEMS = new Set([
  '$Recycle.Bin',
  'System Volume Information',
  '$WinREAgent',
  'Recovery',
  'DumpStack.log.tmp',
  'pagefile.sys',
  'hiberfil.sys',
  'swapfile.sys',
  'desktop.ini',
  'thumbs.db',
]);

/**
 * List contents of a directory.
 */
async function listDirectory(dirPath) {
  const normalizedPath = path.resolve(dirPath);

  // Verify path exists and is a directory
  const stat = await fsPromises.stat(normalizedPath);
  if (!stat.isDirectory()) {
    throw Object.assign(new Error('Path is not a directory'), { status: 400 });
  }

  const entries = await fsPromises.readdir(normalizedPath, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    // Skip hidden/system files
    if (HIDDEN_ITEMS.has(entry.name) || entry.name.startsWith('$')) continue;

    try {
      const fullPath = path.join(normalizedPath, entry.name);
      const stats = await fsPromises.stat(fullPath).catch(() => null);
      if (!stats) continue;

      let isEmpty = true;
      let previews = [];
      if (entry.isDirectory()) {
        try {
          const dir = await fsPromises.opendir(fullPath);
          for await (const child of dir) {
            if (!HIDDEN_ITEMS.has(child.name) && !child.name.startsWith('$')) {
              isEmpty = false;
              if (child.isDirectory()) {
                if (previews.length < 3 && !previews.includes('directory')) previews.push('directory');
              } else {
                const ext = path.extname(child.name).toLowerCase();
                if (previews.length < 3) previews.push(ext);
              }
              if (previews.length >= 3) break;
            }
          }
        } catch {
          // ignore
        }
      }

      items.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        isEmpty: entry.isDirectory() ? isEmpty : null,
        previews: entry.isDirectory() ? previews : null,
        size: entry.isDirectory() ? null : stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        extension: entry.isDirectory() ? null : path.extname(entry.name).toLowerCase(),
        isStarred: starService.isStarred(fullPath),
      });
    } catch {
      // Skip files we can't stat (permission errors, etc.)
    }
  }

  // Sort: folders first, then by name
  items.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return {
    path: normalizedPath,
    parent: path.dirname(normalizedPath),
    itemCount: items.length,
    items,
  };
}

/**
 * Create a new directory.
 */
async function createDirectory(dirPath) {
  const normalizedPath = path.resolve(dirPath);
  await safeMkdir(normalizedPath, { recursive: false });
  return { success: true, path: normalizedPath };
}

/**
 * Rename a file or directory.
 */
async function rename(oldPath, newName) {
  const normalizedOld = path.resolve(oldPath);
  const dir = path.dirname(normalizedOld);
  const newPath = path.join(dir, newName);

  // Check if target already exists
  try {
    await fsPromises.access(newPath);
    throw Object.assign(new Error('A file or folder with that name already exists'), { status: 409 });
  } catch (err) {
    if (err.status === 409) throw err;
    // File doesn't exist — good, we can proceed
  }

  await fsPromises.rename(normalizedOld, newPath);
  return { success: true, oldPath: normalizedOld, newPath };
}

/**
 * Move files/folders to the app recycle bin.
 */
async function deleteItems(paths) {
  const results = [];
  for (const itemPath of paths) {
    try {
      const result = await recycleBinService.moveToBin(itemPath);
      results.push({ path: result.originalPath, binPath: result.binPath, id: result.id, success: true });
    } catch (err) {
      results.push({ path: itemPath, success: false, error: err.message });
    }
  }
  return { success: results.every(r => r.success), results, count: results.filter(r => r.success).length };
}

/**
 * Copy files/folders to destination.
 */
async function copyItems(sources, destDir) {
  const results = [];
  for (const source of sources) {
    try {
      const srcPath = path.resolve(source);
      const baseName = path.basename(srcPath);
      let destPath = path.join(path.resolve(destDir), baseName);

      // Handle naming conflicts
      destPath = await getUniquePath(destPath);

      const stat = await fsPromises.stat(srcPath);
      if (stat.isDirectory()) {
        await copyDirRecursive(srcPath, destPath);
      } else {
        await fsPromises.copyFile(srcPath, destPath);
      }
      results.push({ source: srcPath, dest: destPath, success: true });
    } catch (err) {
      results.push({ source, success: false, error: err.message });
    }
  }
  return { success: results.every(r => r.success), results };
}

/**
 * Move files/folders to destination.
 */
async function moveItems(sources, destDir) {
  const results = [];
  for (const source of sources) {
    try {
      const srcPath = path.resolve(source);
      const baseName = path.basename(srcPath);
      let destPath = path.join(path.resolve(destDir), baseName);

      destPath = await getUniquePath(destPath);
      await fsPromises.rename(srcPath, destPath);
      results.push({ source: srcPath, dest: destPath, success: true });
    } catch (err) {
      // If rename fails (cross-device), try copy + delete
      try {
        const srcPath = path.resolve(source);
        const baseName = path.basename(srcPath);
        let destPath = path.join(path.resolve(destDir), baseName);
        destPath = await getUniquePath(destPath);

        const stat = await fsPromises.stat(srcPath);
        if (stat.isDirectory()) {
          await copyDirRecursive(srcPath, destPath);
        } else {
          await fsPromises.copyFile(srcPath, destPath);
        }
        await fsPromises.rm(srcPath, { recursive: true, force: true });
        results.push({ source: srcPath, dest: destPath, success: true });
      } catch (err2) {
        results.push({ source, success: false, error: err2.message });
      }
    }
  }
  return { success: results.every(r => r.success), results };
}

/**
 * Search for files by name in a directory tree.
 */
async function searchFiles(rootPath, query, maxResults = 100) {
  const normalizedRoot = path.resolve(rootPath);
  const results = [];
  const lowerQuery = query.toLowerCase();

  async function searchDir(dirPath, depth = 0) {
    if (depth > 5 || results.length >= maxResults) return; // Max depth 5 levels

    try {
      const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) return;
        if (HIDDEN_ITEMS.has(entry.name) || entry.name.startsWith('$')) continue;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.name.toLowerCase().includes(lowerQuery)) {
          try {
            const stats = await fsPromises.stat(fullPath);
            results.push({
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory(),
              size: entry.isDirectory() ? null : stats.size,
              modified: stats.mtime.toISOString(),
              extension: entry.isDirectory() ? null : path.extname(entry.name).toLowerCase(),
            });
          } catch { /* skip */ }
        }

        if (entry.isDirectory()) {
          await searchDir(fullPath, depth + 1);
        }
      }
    } catch { /* skip inaccessible directories */ }
  }

  await searchDir(normalizedRoot);
  return { query, root: normalizedRoot, results };
}

// --- Helpers ---

async function copyDirRecursive(src, dest) {
  await safeMkdir(dest, { recursive: true });
  const entries = await fsPromises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fsPromises.copyFile(srcPath, destPath);
    }
  }
}

async function getUniquePath(targetPath) {
  let newPath = targetPath;
  let counter = 1;
  const ext = path.extname(targetPath);
  const base = ext ? targetPath.slice(0, -ext.length) : targetPath;

  while (true) {
    try {
      await fsPromises.access(newPath);
      // File exists, try next name
      newPath = ext ? `${base} (${counter})${ext}` : `${base} (${counter})`;
      counter++;
    } catch {
      // File doesn't exist — this name is available
      return newPath;
    }
  }
}

/**
 * Get detailed info about a single item, including recursive folder size.
 */
async function getItemInfo(itemPath) {
  const normalizedPath = path.resolve(itemPath);
  const stats = await fsPromises.stat(normalizedPath);
  
  let info = {
    name: path.basename(normalizedPath),
    path: normalizedPath,
    isDirectory: stats.isDirectory(),
    size: stats.size,
    modified: stats.mtime.toISOString(),
    created: stats.birthtime.toISOString(),
    accessed: stats.atime.toISOString(),
    extension: stats.isDirectory() ? null : path.extname(normalizedPath).toLowerCase(),
    isStarred: starService.isStarred(normalizedPath),
  };

  if (stats.isDirectory()) {
    let totalSize = 0;
    let fileCount = 0;
    let folderCount = 0;

    async function calculateSize(dirPath) {
      try {
        const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (HIDDEN_ITEMS.has(entry.name) || entry.name.startsWith('$')) continue;
          
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            folderCount++;
            await calculateSize(fullPath);
          } else {
            fileCount++;
            try {
              const s = await fsPromises.stat(fullPath);
              totalSize += s.size;
            } catch { /* skip */ }
          }
        }
      } catch { /* skip */ }
    }

    await calculateSize(normalizedPath);
    info.size = totalSize;
    info.fileCount = fileCount;
    info.folderCount = folderCount;
  }

  return info;
}

module.exports = { 
  listDirectory, 
  createDirectory, 
  rename, 
  deleteItems, 
  copyItems, 
  moveItems, 
  searchFiles,
  getItemInfo 
};
