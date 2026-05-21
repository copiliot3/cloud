const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { listDirectory, createDirectory, rename, deleteItems, copyItems, moveItems, searchFiles, getItemInfo } = require('../services/fileService');
const starService = require('../services/starService');
const recentService = require('../services/recentService');
const recycleBinService = require('../services/recycleBinService');
const { streamSearch, quickSearch } = require('../services/searchService');
const backgroundJobService = require('../services/backgroundJobService');

// GET /api/files/info?path= — Get detailed item info
router.get('/info', async (req, res, next) => {
  try {
    const itemPath = req.query.path;
    if (!itemPath) {
      return res.status(400).json({ success: false, error: 'path is required' });
    }
    const result = await getItemInfo(itemPath);
    await recentService.recordRecent(itemPath, 'viewed');
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/files?path= — List directory contents
router.get('/', async (req, res, next) => {
  try {
    const dirPath = req.query.path;
    if (!dirPath) {
      return res.status(400).json({ success: false, error: 'path query parameter is required' });
    }
    const result = await listDirectory(dirPath);
    await recentService.recordRecent(dirPath, 'opened');
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.code === 'ENOENT') err.status = 404;
    if (err.code === 'EPERM' || err.code === 'EACCES') err.status = 403;
    next(err);
  }
});

// GET /api/files/search/stream?q=&path= — SSE streaming search
router.get('/search/stream', (req, res) => {
  const { q, path: searchPath } = req.query;
  if (!q || !searchPath) {
    return res.status(400).json({ success: false, error: 'q and path are required' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Create AbortController for cleanup
  const ac = new AbortController();

  req.on('close', () => {
    ac.abort();
  });

  streamSearch(
    searchPath,
    q,
    // onResults — send each batch as an SSE event
    (batch) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'results', items: batch })}\n\n`);
      }
    },
    // onDone — send completion event
    (stats) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'done', ...stats })}\n\n`);
        res.end();
      }
    },
    ac.signal
  );
});

// GET /api/files/search/quick?q=&path= — Fast non-streaming search
router.get('/search/quick', async (req, res, next) => {
  try {
    const { q, path: searchPath } = req.query;
    if (!q || !searchPath) {
      return res.status(400).json({ success: false, error: 'q and path are required' });
    }
    const result = await quickSearch(searchPath, q);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/files/search?q=&path= — Search files by name (legacy)
router.get('/search', async (req, res, next) => {
  try {
    const { q, path: searchPath } = req.query;
    if (!q || !searchPath) {
      return res.status(400).json({ success: false, error: 'q and path query parameters are required' });
    }
    const result = await searchFiles(searchPath, q);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/files/recent — Get recently opened/viewed/downloaded items
router.get('/recent', async (req, res, next) => {
  try {
    const items = await recentService.getRecentItems();
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
});

// POST /api/files/recent — Record a recent file action
router.post('/recent', async (req, res, next) => {
  try {
    const { path: itemPath, action = 'opened' } = req.body;
    if (!itemPath) {
      return res.status(400).json({ success: false, error: 'path is required' });
    }
    const item = await recentService.recordRecent(itemPath, action);
    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
});

// GET /api/files/background-jobs/status — Get status of background jobs
router.get('/background-jobs/status', (req, res) => {
  const { ids } = req.query;
  if (!ids) {
    return res.status(400).json({ success: false, error: 'ids parameter is required' });
  }
  const idList = ids.split(',').map(id => id.trim());
  const statuses = backgroundJobService.getJobsStatus(idList);
  res.json({ success: true, statuses });
});

// GET /api/files/recycle-bin — List recycle bin items
router.get(['/recycle-bin', '/trash'], async (req, res, next) => {
  try {
    const items = await recycleBinService.listItems();
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
});

// GET /api/files/recycle-bin/settings — Get recycle bin settings
router.get(['/recycle-bin/settings', '/trash/settings'], async (req, res, next) => {
  try {
    const settings = await recycleBinService.readSettings();
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

// POST /api/files/recycle-bin/settings — Update recycle bin settings
router.post(['/recycle-bin/settings', '/trash/settings'], async (req, res, next) => {
  try {
    const settings = await recycleBinService.writeSettings(req.body || {});
    await recycleBinService.purgeExpiredItems();
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

// POST /api/files/recycle-bin/restore — Restore a recycle bin item
router.post(['/recycle-bin/restore', '/trash/restore'], async (req, res, next) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id is required' });
    }
    const result = await recycleBinService.restoreItem(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/files/recycle-bin/delete — Permanently delete recycle bin items
router.post(['/recycle-bin/delete', '/trash/delete'], async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids array is required' });
    }
    const result = await recycleBinService.deleteItems(ids);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/files/mkdir — Create directory
router.post('/mkdir', async (req, res, next) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) {
      return res.status(400).json({ success: false, error: 'path is required' });
    }
    const result = await createDirectory(dirPath);
    res.json(result);
  } catch (err) {
    if (err.code === 'EEXIST') {
      err.status = 409;
      err.message = 'Directory already exists';
    }
    next(err);
  }
});

// POST /api/files/rename — Rename file or folder
router.post('/rename', async (req, res, next) => {
  try {
    const { oldPath, newName } = req.body;
    if (!oldPath || !newName) {
      return res.status(400).json({ success: false, error: 'oldPath and newName are required' });
    }
    const result = await rename(oldPath, newName);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/files/delete — Delete files/folders
router.post('/delete', async (req, res, next) => {
  try {
    const { paths } = req.body;
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ success: false, error: 'paths array is required' });
    }
    const result = await deleteItems(paths);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/files/copy — Copy files/folders
router.post('/copy', async (req, res, next) => {
  try {
    const { sources, destination } = req.body;
    if (!sources || !destination) {
      return res.status(400).json({ success: false, error: 'sources and destination are required' });
    }
    const result = await copyItems(sources, destination);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/files/move — Move files/folders
router.post('/move', async (req, res, next) => {
  try {
    const { sources, destination } = req.body;
    if (!sources || !destination) {
      return res.status(400).json({ success: false, error: 'sources and destination are required' });
    }
    const result = await moveItems(sources, destination);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/files/download?path= — Download single file or ZIP of multiple
router.get('/download', async (req, res, next) => {
  try {
    const filePath = req.query.path;
    const paths = req.query.paths; // comma-separated for multi-download

    if (paths) {
      // Multi-file download as ZIP
      const pathList = paths.split(',').map(p => p.trim());
      await Promise.all(pathList.map(p => recentService.recordRecent(p, 'downloaded')));
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="download.zip"');

      const archive = archiver('zip', { zlib: { level: 5 } });
      archive.pipe(res);

      for (const p of pathList) {
        const resolved = path.resolve(p);
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
          archive.directory(resolved, path.basename(resolved));
        } else {
          archive.file(resolved, { name: path.basename(resolved) });
        }
      }

      await archive.finalize();
    } else if (filePath) {
      const resolved = path.resolve(filePath);
      const stat = fs.statSync(resolved);
      await recentService.recordRecent(resolved, 'downloaded');

      if (stat.isDirectory()) {
        // Download folder as ZIP
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(resolved)}.zip"`);

        const archive = archiver('zip', { zlib: { level: 5 } });
        archive.pipe(res);
        archive.directory(resolved, path.basename(resolved));
        await archive.finalize();
      } else {
        // Download single file
        res.download(resolved, path.basename(resolved));
      }
    } else {
      return res.status(400).json({ success: false, error: 'path or paths parameter required' });
    }
  } catch (err) {
    if (err.code === 'ENOENT') err.status = 404;
    next(err);
  }
});

// GET /api/files/starred — Get all starred items with full metadata
router.get('/starred', async (req, res, next) => {
  try {
    const items = await starService.getStarredItems();
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
});

// POST /api/files/star — Star a file or folder path
router.post('/star', async (req, res, next) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'path is required' });
    }
    const result = await starService.starPath(filePath);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/files/unstar — Unstar a file or folder path
router.post('/unstar', async (req, res, next) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'path is required' });
    }
    const result = await starService.unstarPath(filePath);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
