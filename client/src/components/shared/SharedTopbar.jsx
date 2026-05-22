import { useRef } from 'react';
import ViewToggle from './ViewToggle';
import useUIStore from '../../stores/useUIStore';
import SharedSearchInput from './SharedSearchInput';

export default function SharedTopbar({
  share,
  shareId,
  canWrite,
  canRead,
  selectedItems,
  onRefresh,
  onNewFolder,
  onDelete,
  onRename,
  busy,
}) {
  const { toggleSidebar, showModal, addToast, viewMode, setViewMode } =
    useUIStore();
  const hasSelection = selectedItems.size > 0;
  const fileInputRef = useRef(null);

  const handleUpload = () => {
    if (!canWrite) {
      addToast('Permission denied: Read-only access', 'error');
      return;
    }
    showModal('upload');
  };

  const handleNewFolder = () => {
    if (!canWrite) {
      addToast('Permission denied: Read-only access', 'error');
      return;
    }
    onNewFolder();
  };

  const handleDelete = () => {
    if (!canWrite) {
      addToast('Permission denied: Read-only access', 'error');
      return;
    }
    onDelete();
  };

  const handleRename = () => {
    if (!canWrite) {
      addToast('Permission denied: Read-only access', 'error');
      return;
    }
    onRename();
  };

  return (
    <header className="w-full h-16 flex items-center justify-between px-2 shrink-0 bg-transparent mb-2">
      {/* Left side: Menu and breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1 text-on-surface-variant dark:text-zinc-400"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="material-symbols-outlined text-[20px] flex-shrink-0"
            style={{ color: '#013399' }}
          >
            folder
          </span>
          <div className="min-w-0">
            <p className="text-xs text-on-surface-variant dark:text-zinc-400 truncate">
              {share?.permission === 'write' ? 'Read & Write' : 'Read-Only'}
            </p>
            <p className="font-semibold truncate text-sm text-on-surface dark:text-zinc-100">
              {share?.item?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Middle: Search Bar (enabled in shared view) */}
      <div className="hidden lg:block relative w-[500px]">
        {/* Reuse Spotlight/SearchBar behavior from the main UI via SearchResultsView gating */}
        {/* NOTE: SearchResultsView is controlled by useSearchStore.isActive */}
        <div className="relative group w-full opacity-100 pointer-events-auto">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-outline dark:text-zinc-500">
            search
          </span>
          <SharedSearchInput />

        </div>
      </div>


      {/* Right side: Actions and View toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* View toggle */}
        <ViewToggle mode={viewMode} onChange={setViewMode} />

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={busy}
          className="h-11 w-11 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50"
          title="Refresh (F5)"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
        </button>

        {/* New Folder - Only if can write */}
        {canWrite && (
          <>
            <button
              onClick={handleNewFolder}
              disabled={busy}
              className="h-11 w-11 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50"
              title="New Folder"
            >
              <span className="material-symbols-outlined text-[20px]">
                create_new_folder
              </span>
            </button>

            {/* Upload */}
            <button
              onClick={handleUpload}
              disabled={busy}
              className="h-11 w-11 rounded-xl text-white flex items-center justify-center transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#013399' }}
              title="Upload Files"
            >
              <span className="material-symbols-outlined text-[20px]">
                upload
              </span>
            </button>
          </>
        )}

        {/* Rename - Only if one item selected and can write */}
        {canWrite && hasSelection && selectedItems.size === 1 && (
          <button
            onClick={handleRename}
            disabled={busy}
            className="h-11 w-11 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50"
            title="Rename"
          >
            <span className="material-symbols-outlined text-[20px]">
              drive_file_rename_outline
            </span>
          </button>
        )}

        {/* Delete - Only if has selection and can write */}
        {canWrite && hasSelection && (
          <button
            onClick={handleDelete}
            disabled={busy}
            className="h-11 w-11 rounded-xl bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center transition-colors disabled:opacity-50"
            title="Delete"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        )}

        {/* Permission indicator */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{
            backgroundColor: canWrite ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: canWrite ? '#22c55e' : '#3b82f6',
          }}
        >
          <span className="material-symbols-outlined text-[16px]">
            {canWrite ? 'lock_open' : 'lock'}
          </span>
          <span>{canWrite ? 'Read & Write' : 'Read-Only'}</span>
        </div>
      </div>
    </header>
  );
}
