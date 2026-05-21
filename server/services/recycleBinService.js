const fs = require('fs');
const fsPromises = fs.promises;
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const backgroundJobService = require('./backgroundJobService');

const RECYCLE_ROOT = path.join(os.homedir(), '.clouddrive-lumina', 'recyclebin');
const MANIFEST_FILE = path.join(os.homedir(), '.clouddrive-lumina', 'recyclebin.json');
const SETTINGS_FILE = path.join(os.homedir(), '.clouddrive-lumina', 'recyclebin-settings.json');
const DEFAULT_RETENTION_DAYS = 30;

async function safeMkdir(dir, options) {
  const resolved = path.resolve(dir);
  if (path.parse(resolved).root === resolved) {
    return;
  }
  await fsPromises.mkdir(dir, options);
}

async function ensureStore() {
  await safeMkdir(RECYCLE_ROOT, { recursive: true });
  await safeMkdir(path.dirname(MANIFEST_FILE), { recursive: true });
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

async function movePath(src, dest, stats) {
  await safeMkdir(path.dirname(dest), { recursive: true });

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

  // Instantly rename locally to a temporary path that starts with $ (so listDirectory filters it out)
  const tempPath = path.join(path.dirname(normalizedPath), `$deleting-${id}-${path.basename(normalizedPath)}`);
  await fsPromises.rename(normalizedPath, tempPath);

  const job = await backgroundJobService.createJob('delete', {
    id,
    sourcePath: tempPath,
    destPath: binPath,
    originalPath: normalizedPath,
    name: path.basename(normalizedPath),
    isDirectory: stats.isDirectory(),
    size: stats.isDirectory() ? null : stats.size,
    deletedAt: new Date().toISOString(),
  });

  return { success: true, id, originalPath: normalizedPath, binPath, job };
}

async function restoreItem(id) {
  const manifest = await readManifest();
  const item = manifest.find(entry => entry.id === id);
  if (!item) {
    throw Object.assign(new Error('Recycle bin item not found'), { status: 404 });
  }

  // Verify the source still exists
  try {
    await fsPromises.access(item.binPath);
  } catch {
    await writeManifest(manifest.filter(entry => entry.id !== id));
    throw Object.assign(
      new Error(`Source file no longer exists in the recycle bin: "${item.name}"`),
      { status: 404 }
    );
  }

  const restorePath = await getUniquePath(item.originalPath);
  const job = await backgroundJobService.createJob('restore', {
    id,
    binPath: item.binPath,
    restorePath,
    isDirectory: item.isDirectory,
    name: item.name
  });

  return { success: true, id, path: restorePath, job };
}

async function deleteBinPath(item) {
  await fsPromises.rm(item.binPath, { recursive: true, force: true });
}

async function deleteItems(ids) {
  const manifest = await readManifest();
  const foundIds = manifest.filter(item => ids.includes(item.id)).map(item => item.id);
  
  if (foundIds.length === 0) {
    throw Object.assign(new Error('No recycle bin items found for deletion'), { status: 404 });
  }

  const job = await backgroundJobService.createJob('delete_permanent', {
    ids: foundIds
  });

  return { success: true, count: foundIds.length, job };
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
  const activeRestoreIds = new Set(
    backgroundJobService.getActiveJobs()
      .filter(job => job.type === 'restore' || job.type === 'delete_permanent')
      .flatMap(job => job.type === 'delete_permanent' ? (job.params.ids || []) : [job.params.id])
  );

  const valid = [];
  const returnedItems = [];

  for (const item of manifest) {
    if (activeRestoreIds.has(item.id)) {
      // Keep it in manifest (so it doesn't get pruned during copy) but don't show it to the user
      valid.push(item);
      continue;
    }

    try {
      await fsPromises.access(item.binPath);
      valid.push(item);
      returnedItems.push({
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

  return returnedItems;
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
  deleteBinPath,
  readManifest,
  writeManifest,
};
