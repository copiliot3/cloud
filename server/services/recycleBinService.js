const fs = require('fs');
const fsPromises = fs.promises;
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const RECYCLE_ROOT = path.join(os.homedir(), '.clouddrive-lumina', 'recyclebin');
const MANIFEST_FILE = path.join(os.homedir(), '.clouddrive-lumina', 'recyclebin.json');

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

async function listItems() {
  const manifest = await readManifest();
  const valid = [];

  for (const item of manifest) {
    try {
      await fsPromises.access(item.binPath);
      valid.push(item);
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
  listItems,
};
