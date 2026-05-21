const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const starService = require('./starService');

const RECENTS_FILE = path.resolve(__dirname, '../recents.json');
const MAX_RECENTS = 100;

function loadRecents() {
  try {
    if (fs.existsSync(RECENTS_FILE)) {
      return JSON.parse(fs.readFileSync(RECENTS_FILE, 'utf8') || '[]');
    }
  } catch (err) {
    console.error('[RecentService] Failed to load recents:', err.message);
  }
  return [];
}

function saveRecents(items) {
  try {
    fs.writeFileSync(RECENTS_FILE, JSON.stringify(items, null, 2), 'utf8');
  } catch (err) {
    console.error('[RecentService] Failed to save recents:', err.message);
  }
}

async function buildRecentItem(filePath, action, existing = {}) {
  const normalizedPath = path.resolve(filePath);
  const stats = await fsPromises.stat(normalizedPath);
  return {
    ...existing,
    name: path.basename(normalizedPath),
    path: normalizedPath,
    action,
    isDirectory: stats.isDirectory(),
    size: stats.isDirectory() ? null : stats.size,
    modified: stats.mtime.toISOString(),
    created: stats.birthtime.toISOString(),
    extension: stats.isDirectory() ? null : path.extname(normalizedPath).toLowerCase(),
    isStarred: starService.isStarred(normalizedPath),
    lastAccessed: new Date().toISOString(),
  };
}

async function recordRecent(filePath, action = 'opened') {
  if (!filePath) return null;

  try {
    const normalizedPath = path.resolve(filePath);
    const recents = loadRecents().filter(item => item.path !== normalizedPath);
    const item = await buildRecentItem(normalizedPath, action);
    recents.unshift(item);
    saveRecents(recents.slice(0, MAX_RECENTS));
    return item;
  } catch (err) {
    console.warn('[RecentService] Skipped recent item:', err.message);
    return null;
  }
}

async function getRecentItems() {
  const recents = loadRecents();
  const valid = [];

  for (const item of recents) {
    try {
      valid.push(await buildRecentItem(item.path, item.action, item));
    } catch {
      // Item no longer exists, prune it.
    }
  }

  if (valid.length !== recents.length) {
    saveRecents(valid);
  }

  return valid;
}

module.exports = {
  recordRecent,
  getRecentItems,
};
