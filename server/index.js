const express = require('express');
const path = require('path');
const { applySecurity } = require('./middleware/security');
const drivesRouter = require('./routes/drives');
const filesRouter = require('./routes/files');
const uploadRouter = require('./routes/upload');
const manageRouter = require('./routes/manage');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
applySecurity(app);

// --- API Routes ---
app.use('/api/drives', drivesRouter);
app.use('/api/files', filesRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/manage', manageRouter);

// --- Serve React production build ---
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  }
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`\n  ☁️  CloudDrive Lumina server running at http://localhost:${PORT}`);
  console.log(`  📂 API available at http://localhost:${PORT}/api\n`);
});
