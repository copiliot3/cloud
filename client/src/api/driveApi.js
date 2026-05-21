import { api } from './client';

export const driveApi = {
  /** Get all drives with storage info */
  getAll: () => api.get('/drives'),

  /** Get system info */
  getSystemInfo: () => api.get('/drives/system'),
};
