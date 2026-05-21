/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes == null || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(decimals)} ${sizes[i]}`;
}

/**
 * Format bytes as GB/TB for drive display.
 */
export function formatDriveSize(bytes) {
  if (bytes == null) return '0 GB';
  const gb = bytes / (1024 ** 3);
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(1)} TB`;
  }
  return `${Math.round(gb)} GB`;
}
