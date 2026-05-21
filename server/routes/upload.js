const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = req.body.destination || req.query.destination;
    if (!uploadDir) {
      return cb(new Error('destination is required'));
    }
    
    // Decode the original filename (multer encodes it)
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    // Check if originalName contains directory structure (e.g. folder/subfolder/file.txt)
    const normalized = originalName.replace(/\\/g, '/');
    const parts = normalized.split('/');
    
    let targetDir = path.resolve(uploadDir);
    if (parts.length > 1) {
      // Extract the nested folder structure and join it with destination path
      const folderPath = parts.slice(0, -1).join(path.sep);
      targetDir = path.join(targetDir, folderPath);
    }
    
    // Ensure nested directories exist
    const resolved = path.resolve(targetDir);
    if (path.parse(resolved).root !== resolved) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const normalized = originalName.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const basename = parts[parts.length - 1];
    cb(null, basename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2 GB max per file
  },
});

// POST /api/upload?destination= — Upload files
router.post('/', upload.array('files', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }

  const files = req.files.map(f => ({
    name: f.filename,
    path: f.path,
    size: f.size,
    mimeType: f.mimetype,
  }));

  res.json({
    success: true,
    message: `${files.length} file(s) uploaded successfully`,
    files,
  });
});

// Error handling for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: 'File too large (max 2GB)' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

module.exports = router;
