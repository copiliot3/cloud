import { api } from './client';

const sharedApi = {
  /** Get all active shares */
  listAll: () => api.get('/share/list/all'),

  /** Delete a single share by ID */
  delete: (shareId) => fetch(`/api/share/${shareId}`, { method: 'DELETE' }).then(r => r.json()),

  /** Clear all shares at once */
  clearAll: () => fetch('/api/share', { method: 'DELETE' }).then(r => r.json()),

  /** Update a share's permission */
  updatePermission: (shareId, permission) => api.post(`/share/permission/${shareId}`, { permission }),
};

export default sharedApi;

export { sharedApi };
