const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');

const SHARES_FILE = path.resolve(__dirname, '../shares.json');

function loadShares() {
  try {
    if (fs.existsSync(SHARES_FILE)) {
      return JSON.parse(fs.readFileSync(SHARES_FILE, 'utf8') || '[]');
    }
  } catch (err) {
    console.error('[ShareService] Failed to load shares:', err.message);
  }
  return [];
}

function saveShares(shares) {
  fs.writeFileSync(SHARES_FILE, JSON.stringify(shares, null, 2), 'utf8');
}

function isInside(parent, child) {
  const normalizedParent = path.resolve(parent).toLowerCase();
  const normalizedChild = path.resolve(child).toLowerCase();
  return normalizedChild === normalizedParent || normalizedChild.startsWith(normalizedParent + path.sep.toLowerCase());
}

function sanitizeRelativePath(relativePath = '') {
  const normalized = String(relativePath || '').replace(/\\/g, '/');
  if (!normalized || normalized === '.') return '';
  if (path.isAbsolute(normalized)) {
    throw Object.assign(new Error('Absolute paths are not allowed'), { status: 400 });
  }
  const parts = normalized.split('/').filter(Boolean);
  if (parts.some(part => part === '..')) {
    throw Object.assign(new Error('Path traversal is not allowed'), { status: 400 });
  }
  return parts.join(path.sep);
}

function resolveSharedPath(share, relativePath = '') {
  const root = path.resolve(share.path);
  const rel = sanitizeRelativePath(relativePath);
  const target = rel ? path.resolve(root, rel) : root;
  if (!isInside(root, target)) {
    throw Object.assign(new Error('Path is outside the shared scope'), { status: 403 });
  }
  return target;
}

function assertWritable(share) {
  if (share.permission !== 'write') {
    throw Object.assign(new Error('This share is read-only'), { status: 403 });
  }
}

async function itemMetadata(itemPath, rootPath = null) {
  const stats = await fsPromises.stat(itemPath);
  return {
    name: path.basename(itemPath),
    path: itemPath,
    relativePath: rootPath ? path.relative(rootPath, itemPath) : '',
    isDirectory: stats.isDirectory(),
    size: stats.isDirectory() ? null : stats.size,
    modified: stats.mtime.toISOString(),
    created: stats.birthtime.toISOString(),
    extension: stats.isDirectory() ? null : path.extname(itemPath).toLowerCase(),
  };
}

async function createShare(filePath, permission = 'read') {
  if (!['read', 'write'].includes(permission)) {
    throw Object.assign(new Error('permission must be read or write'), { status: 400 });
  }

  const normalizedPath = path.resolve(filePath);
  await fsPromises.access(normalizedPath);
  const stats = await fsPromises.stat(normalizedPath);

  const shares = loadShares();
  const share = {
    id: crypto.randomUUID(),
    path: normalizedPath,
    permission,
    isDirectory: stats.isDirectory(),
    createdAt: new Date().toISOString(),
  };

  shares.unshift(share);
  saveShares(shares);
  return share;
}

async function getShare(shareId) {
  const share = loadShares().find(item => item.id === shareId);
  if (!share) {
    throw Object.assign(new Error('Share link not found'), { status: 404 });
  }

  try {
    const stats = await fsPromises.stat(share.path);
    return {
      ...share,
      exists: true,
      isDirectory: stats.isDirectory(),
      item: await itemMetadata(share.path, share.path),
    };
  } catch {
    return { ...share, exists: false };
  }
}

async function listSharedDirectory(shareId, relativePath = '') {
  const share = await getShare(shareId);
  if (!share.exists) {
    throw Object.assign(new Error('Shared item no longer exists'), { status: 404 });
  }
  if (!share.isDirectory) {
    throw Object.assign(new Error('Shared item is not a folder'), { status: 400 });
  }

  const target = resolveSharedPath(share, relativePath);
  const stats = await fsPromises.stat(target);
  if (!stats.isDirectory()) {
    throw Object.assign(new Error('Path is not a folder'), { status: 400 });
  }

  const entries = await fsPromises.readdir(target, { withFileTypes: true });
  const items = [];
  for (const entry of entries) {
    const fullPath = path.join(target, entry.name);
    try {
      items.push(await itemMetadata(fullPath, share.path));
    } catch {
      // Skip inaccessible items.
    }
  }

  items.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return {
    share,
    path: sanitizeRelativePath(relativePath),
    parent: sanitizeRelativePath(relativePath) ? path.dirname(sanitizeRelativePath(relativePath)) : '',
    items,
  };
}

async function safeMkdir(dir, options) {
  const resolved = path.resolve(dir);
  if (path.parse(resolved).root === resolved) {
    return;
  }
  await fsPromises.mkdir(dir, options);
}

async function createDirectory(shareId, relativePath, name) {
  const share = await getShare(shareId);
  assertWritable(share);
  if (!share.isDirectory) {
    throw Object.assign(new Error('Cannot create folders inside a shared file'), { status: 400 });
  }
  const safeName = sanitizeRelativePath(name);
  if (!safeName || safeName.includes(path.sep)) {
    throw Object.assign(new Error('Folder name is invalid'), { status: 400 });
  }
  const parent = resolveSharedPath(share, relativePath);
  const target = resolveSharedPath(share, path.join(sanitizeRelativePath(relativePath), safeName));
  if (!isInside(parent, target)) {
    throw Object.assign(new Error('Folder name is invalid'), { status: 400 });
  }
  await safeMkdir(target, { recursive: false });
  return { success: true, item: await itemMetadata(target, share.path) };
}

async function deleteItems(shareId, relativePaths) {
  const share = await getShare(shareId);
  assertWritable(share);
  if (!share.isDirectory) {
    throw Object.assign(new Error('Cannot delete through a shared file'), { status: 400 });
  }

  const results = [];
  for (const relativePath of relativePaths) {
    try {
      const target = resolveSharedPath(share, relativePath);
      if (path.resolve(target) === path.resolve(share.path)) {
        throw Object.assign(new Error('Cannot delete the shared root'), { status: 400 });
      }
      await fsPromises.rm(target, { recursive: true, force: false });
      results.push({ relativePath, success: true });
    } catch (err) {
      results.push({ relativePath, success: false, error: err.message });
    }
  }
  return { success: results.every(item => item.success), results };
}

async function renameItem(shareId, relativePath, newName) {
  const share = await getShare(shareId);
  assertWritable(share);
  if (!share.isDirectory) {
    throw Object.assign(new Error('Cannot rename through a shared file'), { status: 400 });
  }
  const safeName = sanitizeRelativePath(newName);
  if (!safeName || safeName.includes(path.sep)) {
    throw Object.assign(new Error('Name is invalid'), { status: 400 });
  }

  const oldPath = resolveSharedPath(share, relativePath);
  if (path.resolve(oldPath) === path.resolve(share.path)) {
    throw Object.assign(new Error('Cannot rename the shared root'), { status: 400 });
  }
  const newPath = resolveSharedPath(share, path.join(path.dirname(sanitizeRelativePath(relativePath)), safeName));
  await fsPromises.rename(oldPath, newPath);
  return { success: true, item: await itemMetadata(newPath, share.path) };
}

async function saveUploadedFiles(shareId, relativePath, files) {
  const share = await getShare(shareId);
  assertWritable(share);
  if (!share.isDirectory) {
    throw Object.assign(new Error('Cannot upload into a shared file'), { status: 400 });
  }

  const targetDir = resolveSharedPath(share, relativePath);
  await safeMkdir(targetDir, { recursive: true });
  const saved = [];

  for (const file of files) {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const safeRelative = sanitizeRelativePath(originalName);
    if (!safeRelative) continue;
    const target = resolveSharedPath(share, path.join(sanitizeRelativePath(relativePath), safeRelative));
    await safeMkdir(path.dirname(target), { recursive: true });
    await fsPromises.writeFile(target, file.buffer);
    saved.push(await itemMetadata(target, share.path));
  }

  return { success: true, files: saved };
}

module.exports = {
  createShare,
  getShare,
  listSharedDirectory,
  createDirectory,
  deleteItems,
  renameItem,
  saveUploadedFiles,
  resolveSharedPath,
  sanitizeRelativePath,
};
