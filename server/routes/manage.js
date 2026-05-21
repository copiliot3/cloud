const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Helper to run shell commands SILENTLY on Windows
const runCmd = (cmd) => {
  return new Promise((resolve, reject) => {
    // windowsHide: true prevents CMD windows from flashing on Windows!
    exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
};

// GET /api/manage/status - Get PM2 process list
router.get('/status', async (req, res, next) => {
  try {
    const stdout = await runCmd('pm2 jlist');
    const processes = JSON.parse(stdout);
    
    const formatted = processes.map(p => ({
      id: p.pm_id,
      name: p.name,
      status: p.pm2_env.status,
      cpu: p.monit.cpu,
      memory: (p.monit.memory / (1024 * 1024)).toFixed(1) + ' MB',
      uptime: Math.floor((Date.now() - p.pm2_env.pm_uptime) / 1000), // in seconds
      restarts: p.pm2_env.restart_time
    }));

    res.json({ success: true, processes: formatted });
  } catch (err) {
    next(err);
  }
});

// POST /api/manage/action - Perform action (restart, stop, start)
router.post('/action', async (req, res, next) => {
  const { action, name } = req.body;
  if (!['restart', 'stop', 'start'].includes(action) || !name) {
    return res.status(400).json({ success: false, error: 'Invalid action or process name' });
  }

  try {
    await runCmd(`pm2 ${action} ${name}`);
    res.json({ success: true, message: `Process ${name} ${action}ed successfully` });
  } catch (err) {
    next(err);
  }
});

// GET /api/manage/system - Get system stats
router.get('/system', (req, res) => {
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const usedMem = totalMem - freeMem;
  
  res.json({
    success: true,
    system: {
      platform: os.platform(),
      uptime: os.uptime(),
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0].model,
      memory: {
        total: (totalMem / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        used: (usedMem / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        free: (freeMem / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        percent: ((usedMem / totalMem) * 100).toFixed(1) + '%'
      }
    }
  });
});

// GET /api/manage/logs - Get process logs DIRECTLY from log files silently!
// This is 100% silent and never flashes any console windows on Windows!
router.get('/logs/:name', (req, res) => {
  const { name } = req.params;
  const pm2LogsDir = path.join(os.homedir(), '.pm2', 'logs');
  const outLogPath = path.join(pm2LogsDir, `${name}-out.log`);
  const errLogPath = path.join(pm2LogsDir, `${name}-error.log`);

  let logs = '';

  try {
    // Read the end of output log (last 40KB)
    if (fs.existsSync(outLogPath)) {
      const fd = fs.openSync(outLogPath, 'r');
      const size = fs.statSync(outLogPath).size;
      const bufferSize = Math.min(size, 40960); // Read last 40KB
      const buffer = Buffer.alloc(bufferSize);
      
      fs.readSync(fd, buffer, 0, bufferSize, size - bufferSize);
      fs.closeSync(fd);
      logs += buffer.toString('utf8');
    }

    // Read the end of error log (last 20KB) if exists
    if (fs.existsSync(errLogPath)) {
      const fd = fs.openSync(errLogPath, 'r');
      const size = fs.statSync(errLogPath).size;
      const bufferSize = Math.min(size, 20480); // Read last 20KB
      const buffer = Buffer.alloc(bufferSize);
      
      fs.readSync(fd, buffer, 0, bufferSize, size - bufferSize);
      fs.closeSync(fd);
      
      const errString = buffer.toString('utf8').trim();
      if (errString) {
        logs += '\n\n--- ERROR LOGS ---\n' + errString;
      }
    }

    // Format to get last 60 lines
    const lines = logs.split('\n').slice(-60).join('\n');
    res.json({ success: true, logs: lines || 'No logs captured yet.' });
  } catch (err) {
    res.json({ success: true, logs: `Error reading logs programmatically: ${err.message}` });
  }
});

module.exports = router;
