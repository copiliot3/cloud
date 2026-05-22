const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const shareService = require('../services/shareService');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

function publicLink(req, id) {
  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}` || 'http://localhost:5173';
  return `${origin}/?share=${id}`;
}

router.post('/', async (req, res, next) => {
  try {
    const { path: filePath, permission = 'read' } = req.body;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'path is required' });
    }

    const share = await shareService.createShare(filePath, permission);
    res.json({ success: true, share, link: publicLink(req, share.id) });
  } catch (err) {
    next(err);
  }
});

router.get('/list/all', async (req, res, next) => {
  try {
    const shares = await shareService.getAllShares();
    res.json({ success: true, shares });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const share = await shareService.getShare(req.params.id);
    if (!share.exists) {
      return res.status(404).json({ success: false, error: 'Shared item no longer exists' });
    }
    res.json({ success: true, share });
  } catch (err) {
    next(err);
  }
});

router.get('/raw/:id', async (req, res, next) => {
  try {
    const share = await shareService.getShare(req.params.id);
    if (!share.exists) {
      return res.status(404).json({ success: false, error: 'Shared item no longer exists' });
    }

    const target = share.isDirectory
      ? shareService.resolveSharedPath(share, req.query.path || '')
      : share.path;
    const stats = fs.statSync(target);
    if (stats.isDirectory()) {
      return res.status(400).json({ success: false, error: 'Use download zip for folders' });
    }
    res.download(target, path.basename(target));
  } catch (err) {
    next(err);
  }
});

router.get('/list/:id', async (req, res, next) => {
  try {
    const result = await shareService.listSharedDirectory(req.params.id, req.query.path || '');
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/mkdir/:id', async (req, res, next) => {
  try {
    const { path: relativePath = '', name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    const result = await shareService.createDirectory(req.params.id, relativePath, name);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/upload/:id', upload.array('files', 50), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }
    const result = await shareService.saveUploadedFiles(req.params.id, req.body.path || req.query.path || '', req.files);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/delete/:id', async (req, res, next) => {
  try {
    const { paths } = req.body;
    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ success: false, error: 'paths array is required' });
    }
    const result = await shareService.deleteItems(req.params.id, paths);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/rename/:id', async (req, res, next) => {
  try {
    const { path: relativePath, newName } = req.body;
    if (!relativePath || !newName) {
      return res.status(400).json({ success: false, error: 'path and newName are required' });
    }
    const result = await shareService.renameItem(req.params.id, relativePath, newName);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/download-zip/:id', async (req, res, next) => {
  try {
    const share = await shareService.getShare(req.params.id);
    if (!share.exists) {
      return res.status(404).json({ success: false, error: 'Shared item no longer exists' });
    }

    const target = share.isDirectory
      ? shareService.resolveSharedPath(share, req.query.path || '')
      : share.path;
    const stats = fs.statSync(target);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(target)}.zip"`);
    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);

    if (stats.isDirectory()) {
      archive.directory(target, path.basename(target));
    } else {
      archive.file(target, { name: path.basename(target) });
    }
    await archive.finalize();
  } catch (err) {
    next(err);
  }
});


// Delete a single share by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const result = shareService.deleteShare(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Clear all shares
router.delete('/', async (req, res, next) => {
  try {
    const result = shareService.clearAllShares();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Update share permission by ID
router.post('/permission/:id', async (req, res, next) => {
  try {
    const { permission } = req.body;
    const share = shareService.updateSharePermission(req.params.id, permission);
    res.json({ success: true, share });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
