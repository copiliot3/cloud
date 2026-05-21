import { api } from './client';

export const shareApi = {
  create: (path, permission) => api.post('/share', { path, permission }),
  get: (id) => api.get(`/share/${encodeURIComponent(id)}`),
  list: (id, path = '') => api.get(`/share/list/${encodeURIComponent(id)}?path=${encodeURIComponent(path)}`),
  mkdir: (id, path, name) => api.post(`/share/mkdir/${encodeURIComponent(id)}`, { path, name }),
  delete: (id, paths) => api.post(`/share/delete/${encodeURIComponent(id)}`, { paths }),
  rename: (id, path, newName) => api.post(`/share/rename/${encodeURIComponent(id)}`, { path, newName }),
  rawUrl: (id, path = '') => `/api/share/raw/${encodeURIComponent(id)}?path=${encodeURIComponent(path)}`,
  zipUrl: (id, path = '') => `/api/share/download-zip/${encodeURIComponent(id)}?path=${encodeURIComponent(path)}`,
  upload: (id, path, files, onProgress) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('path', path || '');
      for (const file of files) {
        formData.append('files', file, file.relativePath || file.name);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/share/upload/${encodeURIComponent(id)}?path=${encodeURIComponent(path || '')}`);
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({ success: true });
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || `Upload failed: ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed due to a network error'));
      xhr.send(formData);
    });
  },
};
