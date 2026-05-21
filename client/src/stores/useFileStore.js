import { create } from 'zustand';
import { fileApi } from '../api/fileApi';

const useFileStore = create((set, get) => ({
  // Current directory state
  currentPath: null,
  parentPath: null,
  items: [],
  loading: false,
  error: null,

  // Starred state
  starredItems: [],
  starredLoading: false,

  // Recent state
  recentItems: [],
  recentLoading: false,

  // Recycle Bin state
  recycleBinItems: [],
  recycleBinLoading: false,
  recycleBinSettings: { retentionDays: 30 },
  trashItems: [],
  trashLoading: false,

  // History for back/forward
  history: [],
  historyIndex: -1,

  // Sort
  sortBy: 'name',
  sortDir: 'asc',

  // Selection
  selectedItems: new Set(),

  // Clipboard
  clipboard: [],
  clipboardAction: null, // 'copy' | 'cut'

  // Search
  searchQuery: '',
  searchResults: null,
  searching: false,

  // Navigate to a path
  navigateTo: async (dirPath) => {
    const { history, historyIndex } = get();
    set({ loading: true, error: null, selectedItems: new Set(), searchResults: null, searchQuery: '' });
    try {
      const data = await fileApi.list(dirPath);
      const sortedItems = sortItems(data.items, get().sortBy, get().sortDir);
      const newHistory = [...history.slice(0, historyIndex + 1), dirPath];
      set({
        currentPath: data.path,
        parentPath: data.parent,
        items: sortedItems,
        loading: false,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Refresh current directory
  refresh: async () => {
    const { currentPath } = get();
    if (!currentPath) return;
    set({ loading: true, error: null });
    try {
      const data = await fileApi.list(currentPath);
      const sortedItems = sortItems(data.items, get().sortBy, get().sortDir);
      set({ items: sortedItems, loading: false, selectedItems: new Set() });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Go back in history
  goBack: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const path = history[newIndex];
      set({ historyIndex: newIndex });
      // Navigate without adding to history
      set({ loading: true, error: null, selectedItems: new Set() });
      fileApi.list(path).then(data => {
        const sortedItems = sortItems(data.items, get().sortBy, get().sortDir);
        set({ currentPath: data.path, parentPath: data.parent, items: sortedItems, loading: false });
      }).catch(err => set({ error: err.message, loading: false }));
    }
  },

  // Go forward in history
  goForward: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const path = history[newIndex];
      set({ historyIndex: newIndex });
      set({ loading: true, error: null, selectedItems: new Set() });
      fileApi.list(path).then(data => {
        const sortedItems = sortItems(data.items, get().sortBy, get().sortDir);
        set({ currentPath: data.path, parentPath: data.parent, items: sortedItems, loading: false });
      }).catch(err => set({ error: err.message, loading: false }));
    }
  },

  // Go up to parent
  goUp: () => {
    const { parentPath, currentPath } = get();
    if (parentPath && parentPath !== currentPath) {
      get().navigateTo(parentPath);
    }
  },

  // Sort
  setSort: (key) => {
    const { sortBy, sortDir, items } = get();
    const newDir = sortBy === key && sortDir === 'asc' ? 'desc' : 'asc';
    set({
      sortBy: key,
      sortDir: newDir,
      items: sortItems(items, key, newDir),
    });
  },

  // Selection
  toggleSelect: (path) => {
    const selected = new Set(get().selectedItems);
    if (selected.has(path)) {
      selected.delete(path);
    } else {
      selected.add(path);
    }
    set({ selectedItems: selected });
  },

  selectItem: (path) => {
    set({ selectedItems: new Set([path]) });
  },

  selectAll: () => {
    const all = new Set(get().items.map(i => i.path));
    set({ selectedItems: all });
  },

  clearSelection: () => {
    set({ selectedItems: new Set() });
  },

  rangeSelect: (path) => {
    const { items, selectedItems } = get();
    const lastSelected = [...selectedItems].pop();
    if (!lastSelected) {
      set({ selectedItems: new Set([path]) });
      return;
    }
    const startIdx = items.findIndex(i => i.path === lastSelected);
    const endIdx = items.findIndex(i => i.path === path);
    if (startIdx === -1 || endIdx === -1) return;
    const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const range = items.slice(from, to + 1).map(i => i.path);
    set({ selectedItems: new Set([...selectedItems, ...range]) });
  },

  // Clipboard
  copyToClipboard: () => {
    const { selectedItems } = get();
    set({ clipboard: [...selectedItems], clipboardAction: 'copy' });
  },

  cutToClipboard: () => {
    const { selectedItems } = get();
    set({ clipboard: [...selectedItems], clipboardAction: 'cut' });
  },

  paste: async () => {
    const { clipboard, clipboardAction, currentPath } = get();
    if (!clipboard.length || !currentPath) return;

    // Use dynamic import to avoid circular dependency issues at the top level
    const useTaskStoreModule = await import('./useTaskStore');
    const useTaskStore = useTaskStoreModule.default;
    const { addTask, updateTask, completeTask, failTask } = useTaskStore.getState();

    const taskId = `task-${Date.now()}`;
    const actionName = clipboardAction === 'copy' ? 'Copying' : 'Moving';
    
    addTask({
      id: taskId,
      type: clipboardAction,
      title: `${actionName} ${clipboard.length} item(s)`
    });

    try {
      if (clipboardAction === 'copy') {
        // Backend doesn't support progress streaming yet, so we just set active and wait
        updateTask(taskId, { status: 'active', progress: 50 });
        await fileApi.copy(clipboard, currentPath);
      } else {
        updateTask(taskId, { status: 'active', progress: 50 });
        await fileApi.move(clipboard, currentPath);
        set({ clipboard: [], clipboardAction: null });
      }
      completeTask(taskId);
      get().refresh();
      return { success: true };
    } catch (err) {
      failTask(taskId, err.message);
      return { success: false, error: err.message };
    }
  },

  // Search
  search: async (query) => {
    const { currentPath } = get();
    if (!query || !currentPath) {
      set({ searchResults: null, searchQuery: '', searching: false });
      return;
    }
    set({ searchQuery: query, searching: true });
    try {
      const data = await fileApi.search(query, currentPath);
      set({ searchResults: data.results, searching: false });
    } catch (err) {
      set({ searching: false });
    }
  },

  clearSearch: () => {
    set({ searchQuery: '', searchResults: null, searching: false });
  },

  fetchStarred: async () => {
    set({ starredLoading: true, error: null });
    try {
      const data = await fileApi.getStarred();
      set({ starredItems: data.items || [], starredLoading: false });
    } catch (err) {
      set({ error: err.message, starredLoading: false });
    }
  },

  fetchRecent: async () => {
    set({ recentLoading: true, error: null });
    try {
      const data = await fileApi.getRecent();
      set({ recentItems: data.items || [], recentLoading: false });
    } catch (err) {
      set({ error: err.message, recentLoading: false });
    }
  },

  fetchRecycleBin: async () => {
    set({ recycleBinLoading: true, trashLoading: true, error: null });
    try {
      const data = await fileApi.getRecycleBin();
      set({
        recycleBinItems: data.items || [],
        trashItems: data.items || [],
        recycleBinLoading: false,
        trashLoading: false,
      });
    } catch (err) {
      set({ error: err.message, recycleBinLoading: false, trashLoading: false });
    }
  },

  fetchRecycleBinSettings: async () => {
    try {
      const data = await fileApi.getRecycleBinSettings();
      set({ recycleBinSettings: data.settings || { retentionDays: 30 } });
      return data.settings;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  updateRecycleBinSettings: async (retentionDays) => {
    try {
      const data = await fileApi.updateRecycleBinSettings(retentionDays);
      set({ recycleBinSettings: data.settings || { retentionDays } });
      await get().fetchRecycleBin();
      return { success: true, settings: data.settings };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  restoreRecycleBinItem: async (id) => {
    try {
      const result = await fileApi.restoreRecycleBin(id);
      await get().fetchRecycleBin();
      if (result.job) {
        get().trackBackgroundJobs([result.job.id], 'Restore', `Restoring "${result.job.params?.name || 'item'}"`);
      } else {
        const useUIStoreModule = await import('./useUIStore');
        useUIStoreModule.default.getState().addToast('Item restored successfully', 'success');
      }
      return result;
    } catch (err) {
      const useUIStoreModule = await import('./useUIStore');
      useUIStoreModule.default.getState().addToast(err.message, 'error');
      return { success: false, error: err.message };
    }
  },

  deleteRecycleBinItems: async (ids) => {
    try {
      const result = await fileApi.deleteRecycleBin(ids);
      await get().fetchRecycleBin();
      if (result.job) {
        get().trackBackgroundJobs([result.job.id], 'DeletePermanent', `Permanently deleting ${ids.length} item(s)`);
      } else {
        const useUIStoreModule = await import('./useUIStore');
        useUIStoreModule.default.getState().addToast('Items permanently deleted', 'success');
      }
      return result;
    } catch (err) {
      const useUIStoreModule = await import('./useUIStore');
      useUIStoreModule.default.getState().addToast(err.message, 'error');
      return { success: false, error: err.message };
    }
  },

  deleteFiles: async (paths) => {
    try {
      const response = await fileApi.delete(paths);
      // Instantly refresh the directory view so renamed items disappear
      get().refresh();

      const jobs = response.results?.map(r => r.job).filter(Boolean) || [];
      const jobIds = jobs.map(j => j.id);

      if (jobIds.length > 0) {
        get().trackBackgroundJobs(jobIds, 'Delete', `Moving ${paths.length} item(s) to Recycle Bin`);
      } else {
        const failed = response.results?.filter(item => !item.success) || [];
        const useUIStoreModule = await import('./useUIStore');
        const { addToast } = useUIStoreModule.default.getState();
        if (failed.length) {
          addToast(`Could not delete ${failed.length} item(s): ${failed.map(item => item.error).join(', ')}`, 'error');
        } else {
          addToast(`${paths.length} item(s) moved to Recycle Bin`, 'success');
        }
      }
      return response;
    } catch (err) {
      const useUIStoreModule = await import('./useUIStore');
      useUIStoreModule.default.getState().addToast(err.message, 'error');
      return { success: false, error: err.message };
    }
  },

  trackBackgroundJobs: async (jobIds, type, label) => {
    const useUIStoreModule = await import('./useUIStore');
    const useUIStore = useUIStoreModule.default;
    const { addToast, updateToast } = useUIStore.getState();

    const toastId = addToast(`${label}...`, 'loading');

    const interval = setInterval(async () => {
      try {
        const response = await fileApi.getBackgroundJobsStatus(jobIds);
        const statuses = response.statuses || {};
        
        let allCompleted = true;
        let anyFailed = false;
        let failureError = '';
        let totalProgress = 0;
        let jobCount = 0;

        for (const id of jobIds) {
          const job = statuses[id];
          if (job) {
            jobCount++;
            totalProgress += job.progress || 0;
            if (job.status === 'failed') {
              anyFailed = true;
              failureError = job.error || 'Operation failed';
            }
            if (job.status !== 'completed' && job.status !== 'failed') {
              allCompleted = false;
            }
          } else {
            allCompleted = false;
          }
        }

        const avgProgress = jobCount > 0 ? Math.round(totalProgress / jobCount) : 0;

        if (anyFailed) {
          clearInterval(interval);
          updateToast(toastId, `Failed: ${label} (${failureError})`, 'error');
          get().refresh();
          get().fetchRecycleBin();
        } else if (allCompleted) {
          clearInterval(interval);
          updateToast(toastId, `Completed: ${label}`, 'success');
          get().refresh();
          get().fetchRecycleBin();
        } else {
          updateToast(toastId, `${label} (${avgProgress}%)...`, 'loading');
        }
      } catch (err) {
        console.error('Error checking background job status:', err);
      }
    }, 1000);
  },

  fetchTrash: () => get().fetchRecycleBin(),
  restoreTrashItem: (id) => get().restoreRecycleBinItem(id),

  toggleStar: async (item) => {
    try {
      const isCurrentlyStarred = !!item.isStarred;
      if (isCurrentlyStarred) {
        await fileApi.unstar(item.path);
      } else {
        await fileApi.star(item.path);
      }
      
      // Update item in standard list
      set((state) => {
        const updatedItems = state.items.map((i) =>
          i.path === item.path ? { ...i, isStarred: !isCurrentlyStarred } : i
        );
        return { items: updatedItems };
      });
      
      // Refresh starred items
      await get().fetchStarred();
      
      return { success: true };
    } catch (err) {
      console.error('Failed to toggle star:', err);
      return { success: false, error: err.message };
    }
  },
}));

// Helper: sort items (folders first, then by key)
function sortItems(items, key, dir) {
  return [...items].sort((a, b) => {
    // Folders always first
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;

    let valA, valB;
    switch (key) {
      case 'name':
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
        return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      case 'modified':
        valA = new Date(a.modified || 0).getTime();
        valB = new Date(b.modified || 0).getTime();
        break;
      case 'size':
        valA = a.size || 0;
        valB = b.size || 0;
        break;
      case 'extension':
        valA = (a.extension || '').toLowerCase();
        valB = (b.extension || '').toLowerCase();
        return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      default:
        return 0;
    }
    return dir === 'asc' ? valA - valB : valB - valA;
  });
}

export default useFileStore;
