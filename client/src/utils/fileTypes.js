/**
 * Map file extensions to icon names and colors.
 */
const FILE_TYPE_MAP = {
  // Folders
  directory: { icon: 'folder', color: '#f0b429', label: 'File folder' },

  // Documents
  '.pdf':  { icon: 'picture_as_pdf', color: '#e53935', label: 'PDF Document' },
  '.doc':  { icon: 'description', color: '#1565c0', label: 'Word Document' },
  '.docx': { icon: 'description', color: '#1565c0', label: 'Word Document' },
  '.txt':  { icon: 'article', color: '#546e7a', label: 'Text Document' },
  '.rtf':  { icon: 'description', color: '#1565c0', label: 'Rich Text' },
  '.md':   { icon: 'article', color: '#546e7a', label: 'Markdown' },

  // Spreadsheets
  '.xls':  { icon: 'table_chart', color: '#2e7d32', label: 'Excel Spreadsheet' },
  '.xlsx': { icon: 'table_chart', color: '#2e7d32', label: 'Excel Spreadsheet' },
  '.csv':  { icon: 'table_chart', color: '#2e7d32', label: 'CSV File' },

  // Presentations
  '.ppt':  { icon: 'slideshow', color: '#d84315', label: 'PowerPoint' },
  '.pptx': { icon: 'slideshow', color: '#d84315', label: 'PowerPoint Deck' },

  // Images
  '.jpg':  { icon: 'image', color: '#00897b', label: 'JPEG Image' },
  '.jpeg': { icon: 'image', color: '#00897b', label: 'JPEG Image' },
  '.png':  { icon: 'image', color: '#00897b', label: 'PNG Image' },
  '.gif':  { icon: 'image', color: '#00897b', label: 'GIF Image' },
  '.svg':  { icon: 'image', color: '#00897b', label: 'SVG Image' },
  '.webp': { icon: 'image', color: '#00897b', label: 'WebP Image' },
  '.bmp':  { icon: 'image', color: '#00897b', label: 'Bitmap' },
  '.ico':  { icon: 'image', color: '#00897b', label: 'Icon' },

  // Video
  '.mp4':  { icon: 'movie', color: '#6a1b9a', label: 'MP4 Video' },
  '.avi':  { icon: 'movie', color: '#6a1b9a', label: 'AVI Video' },
  '.mkv':  { icon: 'movie', color: '#6a1b9a', label: 'MKV Video' },
  '.mov':  { icon: 'movie', color: '#6a1b9a', label: 'MOV Video' },
  '.webm': { icon: 'movie', color: '#6a1b9a', label: 'WebM Video' },
  '.wmv':  { icon: 'movie', color: '#6a1b9a', label: 'WMV Video' },

  // Audio
  '.mp3':  { icon: 'music_note', color: '#e91e63', label: 'MP3 Audio' },
  '.wav':  { icon: 'music_note', color: '#e91e63', label: 'WAV Audio' },
  '.flac': { icon: 'music_note', color: '#e91e63', label: 'FLAC Audio' },
  '.aac':  { icon: 'music_note', color: '#e91e63', label: 'AAC Audio' },
  '.ogg':  { icon: 'music_note', color: '#e91e63', label: 'OGG Audio' },

  // Archives
  '.zip':  { icon: 'folder_zip', color: '#f9a825', label: 'ZIP Archive' },
  '.rar':  { icon: 'folder_zip', color: '#f9a825', label: 'RAR Archive' },
  '.7z':   { icon: 'folder_zip', color: '#f9a825', label: '7-Zip Archive' },
  '.tar':  { icon: 'folder_zip', color: '#f9a825', label: 'TAR Archive' },
  '.gz':   { icon: 'folder_zip', color: '#f9a825', label: 'GZip Archive' },

  // Code
  '.js':   { icon: 'code', color: '#f7df1e', label: 'JavaScript' },
  '.jsx':  { icon: 'code', color: '#61dafb', label: 'React JSX' },
  '.ts':   { icon: 'code', color: '#3178c6', label: 'TypeScript' },
  '.tsx':  { icon: 'code', color: '#3178c6', label: 'React TSX' },
  '.py':   { icon: 'code', color: '#3572a5', label: 'Python' },
  '.java': { icon: 'code', color: '#b07219', label: 'Java' },
  '.html': { icon: 'code', color: '#e34c26', label: 'HTML' },
  '.css':  { icon: 'code', color: '#563d7c', label: 'CSS' },
  '.json': { icon: 'data_object', color: '#546e7a', label: 'JSON' },
  '.xml':  { icon: 'code', color: '#546e7a', label: 'XML' },
  '.yaml': { icon: 'data_object', color: '#546e7a', label: 'YAML' },
  '.yml':  { icon: 'data_object', color: '#546e7a', label: 'YAML' },

  // Executables
  '.exe':  { icon: 'terminal', color: '#37474f', label: 'Executable' },
  '.msi':  { icon: 'install_desktop', color: '#37474f', label: 'Installer' },
  '.bat':  { icon: 'terminal', color: '#37474f', label: 'Batch File' },
  '.ps1':  { icon: 'terminal', color: '#012456', label: 'PowerShell' },
  '.sh':   { icon: 'terminal', color: '#37474f', label: 'Shell Script' },

  // Misc
  '.iso':  { icon: 'album', color: '#78909c', label: 'Disk Image' },
  '.dll':  { icon: 'settings', color: '#78909c', label: 'DLL Library' },
  '.sys':  { icon: 'settings', color: '#78909c', label: 'System File' },
  '.log':  { icon: 'receipt_long', color: '#78909c', label: 'Log File' },
  '.ini':  { icon: 'settings', color: '#78909c', label: 'Config File' },
  '.cfg':  { icon: 'settings', color: '#78909c', label: 'Config File' },
};

const DEFAULT_FILE = { icon: 'draft', color: '#78909c', label: 'File' };

export function getFileType(item) {
  if (item.isDirectory) return FILE_TYPE_MAP.directory;
  const ext = (item.extension || '').toLowerCase();
  return FILE_TYPE_MAP[ext] || DEFAULT_FILE;
}

export function getFileTypeLabel(item) {
  return getFileType(item).label;
}

export function getDriveIcon(driveType) {
  switch (driveType?.toLowerCase()) {
    case 'fixed': return 'hard_drive';
    case 'removable': return 'usb';
    case 'network': return 'cloud';
    case 'cdrom': return 'album';
    default: return 'hard_drive';
  }
}
