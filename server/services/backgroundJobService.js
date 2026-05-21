const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const JOBS_FILE = path.join(os.homedir(), '.clouddrive-lumina', 'background-jobs.json');
let jobs = [];
let isProcessing = false;

async function safeMkdir(dir, options) {
  const resolved = path.resolve(dir);
  if (path.parse(resolved).root === resolved) {
    return;
  }
  await fsPromises.mkdir(dir, options);
}

async function ensureJobsStore() {
  await safeMkdir(path.dirname(JOBS_FILE), { recursive: true });
}

async function readJobs() {
  try {
    if (fs.existsSync(JOBS_FILE)) {
      const content = await fsPromises.readFile(JOBS_FILE, 'utf8');
      return JSON.parse(content || '[]');
    }
  } catch (err) {
    console.error('[BackgroundJobService] Failed to read jobs file:', err.message);
  }
  return [];
}

async function writeJobs() {
  try {
    await ensureJobsStore();
    await fsPromises.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf8');
  } catch (err) {
    console.error('[BackgroundJobService] Failed to write jobs file:', err.message);
  }
}

async function initBackgroundJobs() {
  jobs = await readJobs();
  let updated = false;

  // Reset any active/processing/pending jobs to pending on startup
  for (const job of jobs) {
    if (job.status === 'processing' || job.status === 'pending') {
      job.status = 'pending';
      job.progress = 0;
      job.error = null;
      updated = true;
    }
  }

  if (updated) {
    await writeJobs();
  }

  // Start the queue runner
  processQueue().catch(err => {
    console.error('[BackgroundJobService] Queue runner error during init:', err.message);
  });
}

async function createJob(type, params) {
  const job = {
    id: crypto.randomUUID(),
    type,
    status: 'pending',
    progress: 0,
    error: null,
    params,
    createdAt: new Date().toISOString(),
  };

  jobs.unshift(job);
  await writeJobs();

  // Run in background without awaiting the whole queue
  processQueue().catch(err => {
    console.error('[BackgroundJobService] Queue runner error:', err.message);
  });

  return job;
}

function getActiveJobs() {
  return jobs.filter(j => j.status === 'pending' || j.status === 'processing');
}

function getJobsStatus(ids) {
  const result = {};
  for (const id of ids) {
    const job = jobs.find(j => j.id === id);
    if (job) {
      result[id] = {
        status: job.status,
        progress: job.progress,
        error: job.error,
        type: job.type,
      };
    } else {
      result[id] = { status: 'unknown' };
    }
  }
  return result;
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      // Get the oldest pending job (since we unshift new ones, oldest is at the end)
      const pendingJobs = jobs.filter(j => j.status === 'pending');
      if (pendingJobs.length === 0) break;

      // oldest pending job
      const job = pendingJobs[pendingJobs.length - 1];
      job.status = 'processing';
      job.progress = 10;
      await writeJobs();

      try {
        await executeJob(job);
        job.status = 'completed';
        job.progress = 100;
      } catch (err) {
        console.error(`[BackgroundJobService] Job ${job.id} failed:`, err);
        job.status = 'failed';
        job.error = err.message || 'Operation failed';
      }

      await writeJobs();
    }
  } finally {
    isProcessing = false;
  }
}

async function executeJob(job) {
  const recycleBinService = require('./recycleBinService');
  
  if (job.type === 'delete') {
    const { sourcePath, destPath, originalPath, name, isDirectory, size, deletedAt } = job.params;
    
    // Check if renamed source path exists
    try {
      await fsPromises.access(sourcePath);
    } catch {
      throw new Error(`Temporary path no longer exists: "${sourcePath}"`);
    }

    job.progress = 30;
    await writeJobs();

    // Perform the heavy copy/move
    await recycleBinService.movePath(sourcePath, destPath, {
      isDirectory: () => isDirectory
    });

    job.progress = 80;
    await writeJobs();

    // Insert into recycle bin manifest
    const manifest = await recycleBinService.readManifest();
    manifest.unshift({
      id: job.id, // Keep the same ID
      originalPath,
      binPath: destPath,
      name,
      isDirectory,
      size,
      deletedAt
    });
    await recycleBinService.writeManifest(manifest);

  } else if (job.type === 'restore') {
    const { id, binPath, restorePath, isDirectory } = job.params;

    try {
      await fsPromises.access(binPath);
    } catch {
      // Remove item from manifest if the bin file is missing
      const manifest = await recycleBinService.readManifest();
      await recycleBinService.writeManifest(manifest.filter(entry => entry.id !== id));
      throw new Error(`Recycle bin source file no longer exists: "${binPath}"`);
    }

    job.progress = 40;
    await writeJobs();

    await recycleBinService.movePath(binPath, restorePath, {
      isDirectory: () => isDirectory
    });

    job.progress = 80;
    await writeJobs();

    // Remove from recycle bin manifest
    const manifest = await recycleBinService.readManifest();
    await recycleBinService.writeManifest(manifest.filter(entry => entry.id !== id));

  } else if (job.type === 'delete_permanent') {
    const { ids } = job.params;
    const manifest = await recycleBinService.readManifest();
    const remaining = [];
    
    let processed = 0;
    for (const item of manifest) {
      if (ids.includes(item.id)) {
        try {
          await recycleBinService.deleteBinPath(item);
        } catch (err) {
          console.warn(`[BackgroundJobService] Permanent delete failed for path: ${item.binPath}`, err.message);
        }
        processed++;
        job.progress = Math.min(80, Math.floor((processed / ids.length) * 80));
        await writeJobs();
      } else {
        remaining.push(item);
      }
    }

    await recycleBinService.writeManifest(remaining);
  }
}

module.exports = {
  initBackgroundJobs,
  createJob,
  getActiveJobs,
  getJobsStatus,
};
