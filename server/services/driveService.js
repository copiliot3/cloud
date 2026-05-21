const { execSync } = require('child_process');
const os = require('os');

/**
 * Get all available drives on Windows with capacity information.
 * Uses PowerShell Get-PSDrive to enumerate drives.
 */
function getDrives() {
  try {
    // PowerShell command to get drive info as JSON
    const psCommand = `
      Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null -or $_.Free -ne $null } | ForEach-Object {
        [PSCustomObject]@{
          Letter = $_.Name;
          Label = (Get-Volume -DriveLetter $_.Name -ErrorAction SilentlyContinue).FileSystemLabel;
          TotalBytes = if ($_.Used -ne $null -and $_.Free -ne $null) { [double]$_.Used + [double]$_.Free } else { 0 };
          FreeBytes = if ($_.Free -ne $null) { [double]$_.Free } else { 0 };
          UsedBytes = if ($_.Used -ne $null) { [double]$_.Used } else { 0 };
          FileSystem = (Get-Volume -DriveLetter $_.Name -ErrorAction SilentlyContinue).FileSystemType;
          DriveType = (Get-Volume -DriveLetter $_.Name -ErrorAction SilentlyContinue).DriveType;
        }
      } | ConvertTo-Json -Compress
    `;

    const stdout = execSync(
      `powershell -NoProfile -NonInteractive -Command "${psCommand.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`,

      { encoding: 'utf8', timeout: 10000, windowsHide: true }
    );

    let drives = JSON.parse(stdout.trim());
    // Ensure array
    if (!Array.isArray(drives)) drives = [drives];

    return drives
      .filter(d => d.TotalBytes > 0)
      .map(d => ({
        letter: d.Letter,
        label: d.Label || `Local Disk (${d.Letter}:)`,
        totalBytes: d.TotalBytes,
        freeBytes: d.FreeBytes,
        usedBytes: d.UsedBytes,
        percentUsed: d.TotalBytes > 0 ? Math.round((d.UsedBytes / d.TotalBytes) * 100) : 0,
        fileSystem: d.FileSystem || 'NTFS',
        driveType: d.DriveType || 'Fixed',
      }));
  } catch (err) {
    console.error('[DriveService] PowerShell failed, falling back:', err.message);
    return getFallbackDrives();
  }
}

/**
 * Fallback drive detection using basic fs check.
 */
function getFallbackDrives() {
  const drives = [];
  const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ';

  for (const letter of letters) {
    try {
      const path = `${letter}:\\`;
      require('fs').accessSync(path);

      // Try to get space info
      const psCmd = `(Get-PSDrive ${letter}).Free`;
      const free = parseInt(execSync(`powershell -NoProfile -Command "${psCmd}"`, {
        encoding: 'utf8', timeout: 5000, windowsHide: true
      }).trim()) || 0;

      const usedCmd = `(Get-PSDrive ${letter}).Used`;
      const used = parseInt(execSync(`powershell -NoProfile -Command "${usedCmd}"`, {
        encoding: 'utf8', timeout: 5000, windowsHide: true
      }).trim()) || 0;

      const total = free + used;
      if (total > 0) {
        drives.push({
          letter,
          label: `Local Disk (${letter}:)`,
          totalBytes: total,
          freeBytes: free,
          usedBytes: used,
          percentUsed: total > 0 ? Math.round((used / total) * 100) : 0,
          fileSystem: 'NTFS',
          driveType: 'Fixed',
        });
      }
    } catch {
      // Drive not available
    }
  }
  return drives;
}

/**
 * Get system information.
 */
function getSystemInfo() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    cpuCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    nodeVersion: process.version,
  };
}

module.exports = { getDrives, getSystemInfo };
