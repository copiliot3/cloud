const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const STARRED_FILE = path.resolve(__dirname, '../starred.json');

/**
 * Load all starred absolute paths.
 */
function loadStars() {
  try {
    if (fs.existsSync(STARRED_FILE)) {
      const content = fs.readFileSync(STARRED_FILE, 'utf8');
      return JSON.parse(content || '[]');
    }
  } catch (err) {
    console.error('[StarService] Failed to load stars:', err.message);
  }
  return [];
}

/**
 * Save starred paths list to JSON.
 */
function saveStars(stars) {
  try {
    fs.writeFileSync(STARRED_FILE, JSON.stringify(stars, null, 2), 'utf8');
  } catch (err) {
    console.error('[StarService] Failed to save stars:', err.message);
  }
}

/**
 * Check if a specific path is starred.
 */
function isStarred(filePath) {
  const stars = loadStars();
  const normalized = path.resolve(filePath);
  return stars.includes(normalized);
}

/**
 * Add a path to the starred list.
 */
async function starPath(filePath) {
  const stars = loadStars();
  const normalized = path.resolve(filePath);
  if (!stars.includes(normalized)) {
    stars.push(normalized);
    saveStars(stars);
  }
  return { success: true };
}

/**
 * Remove a path from the starred list.
 */
async function unstarPath(filePath) {
  const stars = loadStars();
  const normalized = path.resolve(filePath);
  const index = stars.indexOf(normalized);
  if (index !== -1) {
    stars.splice(index, 1);
    saveStars(stars);
  }
  return { success: true };
}

/**
 * Get all starred items with complete metadata.
 * Validates files exist on disk and prunes dead paths automatically.
 */
async function getStarredItems() {
  const stars = loadStars();
  const items = [];
  const validStars = [];

  for (const itemPath of stars) {
    try {
      const normalizedPath = path.resolve(itemPath);
      // Check if it exists on disk
      await fsPromises.access(normalizedPath);
      const stats = await fsPromises.stat(normalizedPath);

      let isEmpty = true;
      let previews = [];
      if (stats.isDirectory()) {
        try {
          const dir = await fsPromises.opendir(normalizedPath);
          for await (const child of dir) {
            isEmpty = false;
            if (child.isDirectory()) {
              if (previews.length < 3 && !previews.includes('directory')) previews.push('directory');
            } else {
              const ext = path.extname(child.name).toLowerCase();
              if (previews.length < 3) previews.push(ext);
            }
            if (previews.length >= 3) break;
          }
        } catch {
          // ignore
        }
      }

      items.push({
        name: path.basename(normalizedPath),
        path: normalizedPath,
        isDirectory: stats.isDirectory(),
        isEmpty: stats.isDirectory() ? isEmpty : null,
        previews: stats.isDirectory() ? previews : null,
        size: stats.isDirectory() ? null : stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        extension: stats.isDirectory() ? null : path.extname(normalizedPath).toLowerCase(),
        isStarred: true
      });
      validStars.push(normalizedPath);
    } catch (err) {
      // Item no longer exists or is inaccessible, skip and automatically prune
      console.log(`[StarService] Pruning deleted/inaccessible item: ${itemPath}`);
    }
  }

  // If we pruned items, save the updated list
  if (validStars.length !== stars.length) {
    saveStars(validStars);
  }

  return items;
}

module.exports = {
  isStarred,
  starPath,
  unstarPath,
  getStarredItems
};
