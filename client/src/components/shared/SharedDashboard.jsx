import { useEffect, useCallback, useState } from 'react';
import { shareApi } from '../../api/shareApi';
import Sidebar from '../layout/Sidebar';
import SharedTopbar from './SharedTopbar';
import SharedFilesView from './SharedFilesView';
import Modal from './Modal';
import Toast from './Toast';
import TaskManager from './TaskManager';
import SettingsModal from './SettingsModal';
import PropertiesModal from './PropertiesModal';
import CustomColorModal from './CustomColorModal';
import SharedUploadModal from './SharedUploadModal';
import useUIStore from '../../stores/useUIStore';
import { VIEW_MODES } from '../../utils/constants';

export default function SharedDashboard({ shareId }) {
  const [share, setShare] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relativePath, setRelativePath] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [busy, setBusy] = useState(false);

  const {
    viewMode,
    showModal,
    addToast,
    accentColor,
    darkMode,
    hideContextMenu,
    showContextMenu,
    contextMenu,
  } = useUIStore();

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', accentColor);
  }, [accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      if (darkMode === 'dark') {
        root.classList.add('dark');
      } else if (darkMode === 'light') {
        root.classList.remove('dark');
      } else {
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [darkMode]);

  // Load share info and items
  const loadShare = useCallback(async (path = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await shareApi.get(shareId);
      setShare(data.share);

      if (data.share.isDirectory) {
        const listing = await shareApi.list(shareId, path);
        setItems(listing.items || []);
        setRelativePath(listing.path || path);
      }
    } catch (err) {
      console.error('Share load error:', err);
      setError(err.message || 'Failed to load shared content');
    } finally {
      setLoading(false);
    }
  }, [shareId]);

  // Track if we're viewing the root folder object or inside it
  // Changed to default false to show folder contents directly (no modal)
  const [isViewingRootObject, setIsViewingRootObject] = useState(false);

  useEffect(() => {
    loadShare('');
  }, [shareId, loadShare]);

  // When user navigates into the folder, mark that we're no longer at root
  const handleNavigateIntoFolder = useCallback(() => {
    setIsViewingRootObject(false);
  }, []);

  // Navigation
  const navigateTo = useCallback((path) => {
    if (path === '' && relativePath !== '') {
      // Going back to root folder
      loadShare('');
      setIsViewingRootObject(true);
    } else if (path !== '') {
      // Navigating into a subfolder
      if (relativePath === '') {
        // First time entering - mark we're inside the root object
        handleNavigateIntoFolder();
      }
      loadShare(path);
    }
  }, [loadShare, relativePath, handleNavigateIntoFolder]);

  // Selection
  const toggleItemSelection = useCallback((path) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!share?.isDirectory) return;
    const allPaths = new Set(items.map((item) => item.relativePath));
    setSelectedItems(allPaths);
  }, [items, share]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Permissions
  const canRead = share?.permission === 'read' || share?.permission === 'write';
  const canWrite = share?.permission === 'write';

  // File operations
  const deleteItems = useCallback(
    async (paths) => {
      if (!canWrite) {
        addToast('Permission denied', 'error');
        return;
      }

      setBusy(true);
      try {
        const result = await shareApi.delete(shareId, paths);
        if (!result.success) {
          const errorMsg =
            result.results?.find((r) => !r.success)?.error || 'Delete failed';
          throw new Error(errorMsg);
        }
        addToast('Items deleted successfully');
        clearSelection();
        await loadShare(relativePath);
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setBusy(false);
      }
    },
    [shareId, canWrite, relativePath, addToast, clearSelection, loadShare]
  );

  const renameItem = useCallback(
    async (path, newName) => {
      if (!canWrite) {
        addToast('Permission denied', 'error');
        return;
      }

      setBusy(true);
      try {
        await shareApi.rename(shareId, path, newName);
        addToast(`Renamed to "${newName}"`);
        clearSelection();
        await loadShare(relativePath);
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setBusy(false);
      }
    },
    [shareId, canWrite, relativePath, addToast, clearSelection, loadShare]
  );

  const createFolder = useCallback(
    async (name) => {
      if (!canWrite) {
        addToast('Permission denied', 'error');
        return;
      }

      setBusy(true);
      try {
        await shareApi.mkdir(shareId, relativePath, name);
        addToast(`Folder "${name}" created`);
        await loadShare(relativePath);
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setBusy(false);
      }
    },
    [shareId, canWrite, relativePath, addToast, loadShare]
  );

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
        return;

      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        selectAll();
      } else if (ctrl && e.key === 'c') {
        e.preventDefault();
        addToast('Copy not supported in shared view', 'info');
      } else if (e.key === 'Delete') {
        if (selectedItems.size > 0 && canWrite) {
          e.preventDefault();
          const paths = [...selectedItems];
          showModal('delete', {
            count: paths.length,
            onConfirm: () => deleteItems(paths),
          });
        }
      } else if (e.key === 'F2') {
        if (selectedItems.size === 1 && canWrite) {
          e.preventDefault();
          const path = [...selectedItems][0];
          const item = items.find((i) => i.relativePath === path);
          if (item) {
            showModal('rename', {
              name: item.name,
              onConfirm: (newName) => renameItem(path, newName),
            });
          }
        }
      } else if (e.key === 'Escape') {
        clearSelection();
        hideContextMenu();
      } else if (e.key === 'F5') {
        e.preventDefault();
        loadShare(relativePath);
      }
    },
    [
      selectAll,
      selectedItems,
      canWrite,
      showModal,
      deleteItems,
      renameItem,
      items,
      addToast,
      clearSelection,
      hideContextMenu,
      loadShare,
      relativePath,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleMainClick = (e) => {
    if (e.target === e.currentTarget) clearSelection();
    hideContextMenu();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0b0b0c] text-on-surface dark:text-zinc-100 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[36px]">
          progress_activity
        </span>
      </div>
    );
  }

  if (error && !share) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0b0b0c] text-on-surface dark:text-zinc-100 flex items-center justify-center p-6">
        <div className="text-center">
          <span className="material-symbols-outlined text-[64px] text-error mb-4">
            link_off
          </span>
          <h1 className="text-2xl font-bold">Share Unavailable</h1>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-2">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // Single file share view
  if (!share?.isDirectory) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0b0b0c] text-on-surface dark:text-zinc-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-[#161618] border border-black/10 dark:border-white/10 shadow-xl p-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[48px] text-blue-600">
              description
            </span>
          </div>
          <h1 className="mt-5 text-xl font-bold truncate">
            {share.item?.name}
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant dark:text-zinc-400">
            Shared File
          </p>
          <a
            href={shareApi.rawUrl(shareId)}
            className="mt-7 inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-bold shadow-lg active:scale-95 transition-all"
            style={{ backgroundColor: '#013399' }}
          >
            <span className="material-symbols-outlined text-[20px]">
              download
            </span>
            Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f5f6fa] dark:bg-[#0b0b0c] text-on-surface dark:text-zinc-100 font-body-md overflow-hidden">
      {/* Sidebar - Hidden for shared view */}
      {/* <Sidebar /> */}

      <div className="flex-1 flex flex-col min-w-0 pr-4 pb-4 pt-4 lg:pl-0 pl-4 w-full">
        <SharedTopbar
          share={share}
          shareId={shareId}
          canWrite={canWrite}
          canRead={canRead}
          selectedItems={selectedItems}
          onRefresh={() => loadShare(relativePath)}
          onNewFolder={() =>
            showModal('newFolder', {
              onConfirm: (name) => createFolder(name),
            })
          }
          onDelete={() => {
            const paths = [...selectedItems];
            showModal('delete', {
              count: paths.length,
              onConfirm: () => deleteItems(paths),
            });
          }}
          onRename={() => {
            if (selectedItems.size === 1) {
              const path = [...selectedItems][0];
              const item = items.find((i) => i.relativePath === path);
              if (item) {
                showModal('rename', {
                  name: item.name,
                  onConfirm: (newName) => renameItem(path, newName),
                });
              }
            }
          }}
          busy={busy}
        />

        <main
          className="flex-1 bg-white dark:bg-[#161618] rounded-[2rem] shadow-sm dark:shadow-2xl flex flex-col overflow-hidden relative mt-4 border border-surface-variant/30 dark:border-zinc-800/80"
          onClick={handleMainClick}
        >
          {/* Folder Object Wrapper View - shown when accessing folder link at root */}
          {isViewingRootObject && share?.isDirectory && items.length > 0 && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-2xl rounded-[28px] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700/50 shadow-xl p-12 text-center">
                <div className="w-24 h-24 rounded-3xl bg-blue-200 dark:bg-blue-700 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="material-symbols-outlined text-[64px] text-blue-600 dark:text-blue-300">
                    folder_open
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-zinc-100 mb-2 truncate">
                  {share.item?.name}
                </h1>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mb-8">
                  Shared Folder
                  {share.permission === 'write' && <span className="ml-2 inline-block px-3 py-1 bg-green-200 dark:bg-green-700/30 text-green-800 dark:text-green-300 rounded-full text-xs font-semibold">Read & Write</span>}
                  {share.permission === 'read' && <span className="ml-2 inline-block px-3 py-1 bg-blue-200 dark:bg-blue-700/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-semibold">Read-Only</span>}
                </p>
                <div className="grid grid-cols-3 gap-4 my-8 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{items.length}</p>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">Items</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-300">
                      {items.filter(i => !i.isDirectory).length}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">Files</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-300">
                      {items.filter(i => i.isDirectory).length}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">Folders</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleNavigateIntoFolder();
                    setIsViewingRootObject(false);
                  }}
                  className="w-full py-3 px-6 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all"
                  style={{ backgroundColor: '#013399' }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">
                      arrow_forward
                    </span>
                    Open Folder
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* File browser view - shown after user opens the folder or if viewing subfolder */}
          {(!isViewingRootObject || (items.length === 0 && share?.isDirectory)) && (
            <SharedFilesView
              items={items}
              relativePath={relativePath}
              shareId={shareId}
              canWrite={canWrite}
              canRead={canRead}
              selectedItems={selectedItems}
              onNavigate={navigateTo}
              onToggleSelection={toggleItemSelection}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              onDelete={deleteItems}
              onRename={renameItem}
              share={share}
              busy={busy}
              viewMode={viewMode}
            />
          )}
        </main>

        {/* Toast notifications */}
        <Toast />
        {/* Modals */}
        <Modal />
        {/* Settings Modal */}
        <SettingsModal />
        {/* Properties Modal */}
        <PropertiesModal />
        {/* Custom Color Modal */}
        <CustomColorModal />
        {/* Shared Upload Modal */}
        <SharedUploadModal shareId={shareId} canWrite={canWrite} />
        {/* Task Manager */}
        <TaskManager />
      </div>
    </div>
  );
}
