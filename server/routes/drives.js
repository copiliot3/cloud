const express = require('express');
const router = express.Router();
const { getDrives, getSystemInfo } = require('../services/driveService');

// GET /api/drives — List all drives with storage info
router.get('/', (req, res, next) => {
  try {
    const drives = getDrives();
    const totalBytes = drives.reduce((sum, d) => sum + d.totalBytes, 0);
    const usedBytes = drives.reduce((sum, d) => sum + d.usedBytes, 0);
    const freeBytes = drives.reduce((sum, d) => sum + d.freeBytes, 0);

    res.json({
      success: true,
      drives,
      summary: {
        totalDrives: drives.length,
        totalBytes,
        usedBytes,
        freeBytes,
        percentUsed: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/drives/system — System info
router.get('/system', (req, res, next) => {
  try {
    const info = getSystemInfo();
    res.json({ success: true, ...info });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
