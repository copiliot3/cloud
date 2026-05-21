import { create } from 'zustand';
import { driveApi } from '../api/driveApi';

const useDriveStore = create((set) => ({
  drives: [],
  summary: null,
  loading: true,
  error: null,

  fetchDrives: async () => {
    set({ loading: true, error: null });
    try {
      const data = await driveApi.getAll();
      set({ drives: data.drives, summary: data.summary, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
}));

export default useDriveStore;
