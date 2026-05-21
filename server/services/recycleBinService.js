const fs = require('fs');
const fsPromises = fs.promises;
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const RECYCLE_ROOT = path.join(os.homedir(), '.clouddrive-lumina', 'recyclebin');
const MANIFEST_FILE = path.join(os.homedir(), '.clouddrive-lumina', 'recyclebin.json');
const SETTINGS_FILE = path.join(os.homedir(), '.clouddrive-lumina', 'recyclebin-settings.json');
const DEFAULT_RETENTION_DAYS = 30;

async function ensureStore() {
  await fsPromises.mkdir(RECYCLE_ROOT, { recursive: true });
  await fsPromises.mkdir(path.dirname(MANIFEST_FILE), { recursive: true });
}

async function readManifest() {
  try {
    const content = await fsPromises.readFile(MANIFEST_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch {
    return [];
  }
}

async function writeManifest(items) {
  await ensureStore();
  await fsPromises.writeFile(MANIFEST_FILE, JSON.stringify(items, null, 2), 'utf8');
}

async function readSettings() {
  try {
    const content = await fsPromises.readFile(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(content || '{}');
    const retentionDays = Number(parsed.retentionDays);
    return {
      retentionDays: Number.isFinite(retentionDays) && retentionDays >= 1 ? Math.floor(retentionDays) : DEFAULT_RETENTION_DAYS,
    };
  } catch {
    return { retentionDays: DEFAULT_RETENTION_DAYS };
  }
}

async function writeSettings(settings) {
  await ensureStore();
  const retentionDays = Math.max(1, Math.min(365, Math.floor(Number(settings.retentionDays) || DEFAULT_RETENTION_DAYS)));
  const nextSettings = { retentionDays };
  await fsPromises.writeFile(SETTINGS_FILE, JSON.stringify(nextSettings, null, 2), 'utf8');
  return nextSettings;
}

async function copyDirRecursive(src, dest) {
  await fsPromises.mkdir(dest, { recursive: true });
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

async function movePath(src, dest, stats) {
  await fsPromises.mkdir(path.dirname(dest), { recursive: true });

  try {
    await fsPromises.rename(src, dest);
    return;
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
  }

  if (stats.isDirectory()) {
    await copyDirRecursive(src, dest);
    await fsPromises.rm(src, { recursive: true, force: true });
  } else {
    await fsPromises.copyFile(src, dest);
    await fsPromises.unlink(src);
  }
}

async function getUniquePath(targetPath) {
  let candidate = targetPath;
  let counter = 1;
  const ext = path.extname(targetPath);
  const base = ext ? targetPath.slice(0, -ext.length) : targetPath;

  while (true) {
    try {
      await fsPromises.access(candidate);
      candidate = ext ? `${base} (${counter})${ext}` : `${base} (${counter})`;
      counter++;
    } catch {
      return candidate;
    }
  }
}

async function moveToBin(itemPath) {
  await ensureStore();
  const normalizedPath = path.resolve(itemPath);
  const stats = await fsPromises.stat(normalizedPath);
  const id = crypto.randomUUID();
  const binPath = path.join(RECYCLE_ROOT, `${id}-${path.basename(normalizedPath)}`);

  await movePath(normalizedPath, binPath, stats);

  const manifest = await readManifest();
  manifest.unshift({
    id,
    originalPath: normalizedPath,
    binPath,
    name: path.basename(normalizedPath),
    isDirectory: stats.isDirectory(),
    size: stats.isDirectory() ? null : stats.size,
    deletedAt: new Date().toISOString(),
  });
  await writeManifest(manifest);

  return { id, originalPath: normalizedPath, binPath };
}

async function restoreItem(id) {
  const manifest = await readManifest();
  const item = manifest.find(entry => entry.id === id);
  if (!item) {
    throw Object.assign(new Error('Recycle bin item not found'), { status: 404 });
  }

  const stats = await fsPromises.stat(item.binPath);
  const restorePath = await getUniquePath(item.originalPath);
  await movePath(item.binPath, restorePath, stats);
  await writeManifest(manifest.filter(entry => entry.id !== id));

  return { success: true, id, path: restorePath };
}

async function deleteBinPath(item) {
  await fsPromises.rm(item.binPath, { recursive: true, force: true });
}

async function deleteItems(ids) {
  const manifest = await readManifest();
  const idSet = new Set(ids);
  const results = [];
  const remaining = [];

  for (const item of manifest) {
    if (!idSet.has(item.id)) {
      remaining.push(item);
      continue;
    }

    try {
      await deleteBinPath(item);
      results.push({ id: item.id, name: item.name, success: true });
    } catch (err) {
      remaining.push(item);
      results.push({ id: item.id, name: item.name, success: false, error: err.message });
    }
  }

  for (const id of ids) {
    if (!results.some(result => result.id === id)) {
      results.push({ id, success: false, error: 'Recycle bin item not found' });
    }
  }

  await writeManifest(remaining);
  return { success: results.every(result => result.success), results, count: results.filter(result => result.success).length };
}

async function purgeExpiredItems() {
  const settings = await readSettings();
  const manifest = await readManifest();
  const now = Date.now();
  const maxAge = settings.retentionDays * 24 * 60 * 60 * 1000;
  const remaining = [];
  const purged = [];

  for (const item of manifest) {
    const deletedTime = new Date(item.deletedAt).getTime();
    const isExpired = Number.isFinite(deletedTime) && now - deletedTime > maxAge;

    if (!isExpired) {
      remaining.push(item);
      continue;
    }

    try {
      await deleteBinPath(item);
      purged.push({ id: item.id, name: item.name, success: true });
    } catch (err) {
      remaining.push(item);
      purged.push({ id: item.id, name: item.name, success: false, error: err.message });
    }
  }

  if (purged.length > 0) {
    await writeManifest(remaining);
  }

  return { settings, purged };
}

async function listItems() {
  const { settings } = await purgeExpiredItems();
  const manifest = await readManifest();
  const valid = [];

  for (const item of manifest) {
    try {
      await fsPromises.access(item.binPath);
      valid.push({
        ...item,
        retentionDays: settings.retentionDays,
        expiresAt: new Date(new Date(item.deletedAt).getTime() + settings.retentionDays * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch {
      // Prune stale recycle-bin entries.
    }
  }

  if (valid.length !== manifest.length) {
    await writeManifest(valid);
  }

  return valid;
}

module.exports = {
  movePath,
  moveToBin,
  restoreItem,
  deleteItems,
  listItems,
  readSettings,
  writeSettings,
  purgeExpiredItems,
};
