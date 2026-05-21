export const API_BASE = '/api';

export const SORT_OPTIONS = {
  NAME_ASC: { key: 'name', dir: 'asc', label: 'Name (A–Z)' },
  NAME_DESC: { key: 'name', dir: 'desc', label: 'Name (Z–A)' },
  DATE_DESC: { key: 'modified', dir: 'desc', label: 'Date (Newest)' },
  DATE_ASC: { key: 'modified', dir: 'asc', label: 'Date (Oldest)' },
  SIZE_DESC: { key: 'size', dir: 'desc', label: 'Size (Largest)' },
  SIZE_ASC: { key: 'size', dir: 'asc', label: 'Size (Smallest)' },
  TYPE_ASC: { key: 'extension', dir: 'asc', label: 'Type (A–Z)' },
};

export const VIEW_MODES = {
  LIST: 'list',
  GRID: 'grid',
};

export const NAV_ITEMS = [
  { id: 'my-files', label: 'My Files', icon: 'folder_open', filledIcon: true },
  { id: 'recent', label: 'Recent', icon: 'schedule' },
  { id: 'starred', label: 'Starred', icon: 'star' },
  { id: 'trash', label: 'Trash', icon: 'delete' },
];

export const REFRESH_INTERVAL = 30000; // 30 seconds
