import { api } from './client';

export const fileApi = {
  /** List directory contents */
  list: (path) => api.get(`/files?path=${encodeURIComponent(path)}`),
  
  /** Get detailed item info */
  getInfo: (path) => api.get(`/files/info?path=${encodeURIComponent(path)}`),

  /** Search files by name */
  search: (query, path) => api.get(`/files/search?q=${encodeURIComponent(query)}&path=${encodeURIComponent(path)}`),

  /** Create a new directory */
  mkdir: (path) => api.post('/files/mkdir', { path }),

  /** Rename a file or directory */
  rename: (oldPath, newName) => api.post('/files/rename', { oldPath, newName }),

  /** Delete files/folders */
  delete: (paths) => api.post('/files/delete', { paths }),

  /** Copy files/folders */
  copy: (sources, destination) => api.post('/files/copy', { sources, destination }),

  /** Move files/folders */
  move: (sources, destination) => api.post('/files/move', { sources, destination }),

  /** Upload files with progress tracking */
  upload: (destination, files, onProgress) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('destination', destination);
      for (const file of files) {
        formData.append('files', file, file.relativePath || file.name);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/upload?destination=${encodeURIComponent(destination)}`);
      
      // We don't set Content-Type, browser sets it automatically with boundary for FormData
      
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve({ success: true });
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || `Upload failed: ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed due to a network error'));
      xhr.send(formData);
    });
  },

  /** Download file(s) — returns blob URL */
  getDownloadUrl: (path) => `/api/files/download?path=${encodeURIComponent(path)}`,
  getMultiDownloadUrl: (paths) => `/api/files/download?paths=${paths.map(p => encodeURIComponent(p)).join(',')}`,

  /** Star a file or folder */
  star: (path) => api.post('/files/star', { path }),

  /** Unstar a file or folder */
  unstar: (path) => api.post('/files/unstar', { path }),

  /** Get all starred items */
  getStarred: () => api.get('/files/starred'),

  /** Get recent file activity */
  getRecent: () => api.get('/files/recent'),

  /** Record recent file activity */
  recordRecent: (path, action) => api.post('/files/recent', { path, action }),

  /** Recycle Bin */
  getRecycleBin: () => api.get('/files/recycle-bin'),
  restoreRecycleBin: (id) => api.post('/files/recycle-bin/restore', { id }),
  deleteRecycleBin: (ids) => api.post('/files/recycle-bin/delete', { ids }),
  getRecycleBinSettings: () => api.get('/files/recycle-bin/settings'),
  updateRecycleBinSettings: (retentionDays) => api.post('/files/recycle-bin/settings', { retentionDays }),

  // Backwards-compatible aliases for older UI code.
  getTrash: () => api.get('/files/recycle-bin'),
  restoreTrash: (id) => api.post('/files/recycle-bin/restore', { id }),
};
