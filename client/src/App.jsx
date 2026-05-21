import { useEffect, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import SearchResultsView from './components/files/SearchResultsView';
import useSearchStore from './stores/useSearchStore';
import Topbar from './components/layout/Topbar';
import DrivesOverview from './components/drives/DrivesOverview';
import FileListView from './components/files/FileListView';
import FileGridView from './components/files/FileGridView';
import StarredView from './components/files/StarredView';
import RecentView from './components/files/RecentView';
import TrashView from './components/files/TrashView';
import Breadcrumb from './components/navigation/Breadcrumb';
import ContextMenu from './components/actions/ContextMenu';
import UploadZone from './components/actions/UploadZone';
import Modal from './components/shared/Modal';
import Toast from './components/shared/Toast';
import TaskManager from './components/shared/TaskManager';
import SettingsModal from './components/shared/SettingsModal';
import PropertiesModal from './components/shared/PropertiesModal';
import CustomColorModal from './components/shared/CustomColorModal';
import UploadModal from './components/shared/UploadModal';
import ShareModal from './components/shared/ShareModal';
import SharedView from './components/shared/SharedView';
import useUIStore from './stores/useUIStore';
import useFileStore from './stores/useFileStore';
import { VIEW_MODES } from './utils/constants';
import { fileApi } from './api/fileApi';

export default function App() {
  const { currentView, viewMode, hideContextMenu, showModal, addToast, accentColor, darkMode } = useUIStore();
  const { selectedItems, currentPath, refresh, selectAll, clearSelection, copyToClipboard, cutToClipboard, paste, navigateTo } = useFileStore();
  const shareId = new URLSearchParams(window.location.search).get('share');

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

  const { isActive: searchActive } = useSearchStore();

  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (currentView === 'trash') return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'a') {
      e.preventDefault();
      selectAll();
    } else if (ctrl && e.key === 'c') {
      e.preventDefault();
      copyToClipboard();
      addToast('Copied to clipboard', 'info');
    } else if (ctrl && e.key === 'x') {
      e.preventDefault();
      cutToClipboard();
      addToast('Cut to clipboard', 'info');
    } else if (ctrl && e.key === 'v') {
      e.preventDefault();
      paste().then(result => {
        if (result?.success) addToast('Items pasted successfully');
        else if (result?.error) addToast(result.error, 'error');
      });
    } else if (e.key === 'Delete') {
      if (selectedItems.size > 0) {
        const paths = [...selectedItems];
        showModal('delete', {
          count: paths.length,
          onConfirm: async () => {
            try {
              const result = await fileApi.delete(paths);
              const failed = result.results?.filter(item => !item.success) || [];
              if (failed.length) {
                addToast(`Could not delete ${failed.length} item(s): ${failed.map(item => item.error).join(', ')}`, 'error');
              } else {
                addToast(`${paths.length} item(s) moved to Recycle Bin`);
              }
              refresh();
            } catch (err) {
              addToast(err.message, 'error');
            }
          },
        });
      }
    } else if (e.key === 'F2') {
      if (selectedItems.size === 1) {
        const path = [...selectedItems][0];
        const name = path.split('\\').pop();
        showModal('rename', {
          name,
          onConfirm: async (newName) => {
            try {
              await fileApi.rename(path, newName);
              addToast(`Renamed to "${newName}"`);
              refresh();
            } catch (err) {
              addToast(err.message, 'error');
            }
          },
        });
      }
    } else if (e.key === 'Escape') {
      clearSelection();
      hideContextMenu();
    } else if (e.key === 'F5') {
      e.preventDefault();
      refresh();
    } else if (e.key === 'Enter') {
      if (selectedItems.size === 1) {
        const path = [...selectedItems][0];
        const item = useFileStore.getState().items.find(i => i.path === path);
        if (item?.isDirectory) navigateTo(item.path);
      }
    }
  }, [currentView, selectedItems, selectAll, copyToClipboard, cutToClipboard, paste, clearSelection, hideContextMenu, showModal, addToast, refresh, navigateTo]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleMainClick = (e) => {
    if (e.target === e.currentTarget) clearSelection();
    hideContextMenu();
  };

  if (shareId) {
    return <SharedView shareId={shareId} />;
  }

  return (
    <div className="flex h-screen bg-[#f5f6fa] dark:bg-[#0b0b0c] text-on-surface dark:text-zinc-100 font-body-md overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pr-4 pb-4 pt-4 lg:pl-0 pl-4">
        <Topbar />

        <main 
          className="flex-1 bg-white dark:bg-[#161618] rounded-[2rem] shadow-sm dark:shadow-2xl flex flex-col overflow-hidden relative mt-4 border border-surface-variant/30 dark:border-zinc-800/80" 
          onClick={handleMainClick}
        >
          {searchActive ? (
            <SearchResultsView />
          ) : (
            <UploadZone>
              <div className="px-6 py-6 pb-2">
                <Breadcrumb />
              </div>

              {currentView === 'drives' ? (
                <DrivesOverview />
              ) : currentView === 'starred' ? (
                <StarredView />
              ) : currentView === 'recent' ? (
                <RecentView />
              ) : currentView === 'trash' ? (
                <TrashView />
              ) : (
                <>
                  <div className="px-8 py-2">
                    <h2 className="text-[28px] font-bold tracking-tight" style={{ color: accentColor }}>
                      {currentPath?.split('\\').filter(Boolean).pop() || 'Files'}
                    </h2>
                    {selectedItems.size > 0 ? (
                      <p className="font-label-md text-on-surface-variant dark:text-zinc-400 mt-1">
                        {selectedItems.size} item(s) selected
                      </p>
                    ) : (
                      <p className="font-label-md text-on-surface-variant dark:text-zinc-400 mt-1">
                        Manage your files and folders
                      </p>
                    )}
                  </div>
                  {viewMode === VIEW_MODES.LIST ? <FileListView /> : <FileGridView />}
                </>
              )}
            </UploadZone>
          )}
        </main>
      </div>

      <ContextMenu />
      <Modal />
      <Toast />
      <TaskManager />
      <SettingsModal />
      <PropertiesModal />
      <CustomColorModal />
      <UploadModal />
      <ShareModal />

    </div>
  );
}
