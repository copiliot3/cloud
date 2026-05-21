import { useEffect } from 'react';
import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';

export default function TrashView() {
  const { trashItems, trashLoading, fetchTrash, restoreTrashItem } = useFileStore();
  const { accentColor, addToast } = useUIStore();

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (item) => {
    const result = await restoreTrashItem(item.id);
    if (result.success) {
      addToast(`Restored "${item.name}"`);
    } else {
      addToast(result.error || 'Restore failed', 'error');
    }
  };

  if (trashLoading) {
    return (
      <div className="flex-1 px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-[32px] animate-pulse" style={{ color: accentColor }}>delete</span>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight" style={{ color: accentColor }}>Trash</h2>
            <div className="skeleton h-3.5 w-52 mt-1.5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 py-6">
      <div className="mb-6 shrink-0 flex items-center gap-3">
        <span className="material-symbols-outlined text-[32px]" style={{ color: accentColor }}>delete</span>
        <div>
          <h2 className="text-[28px] font-bold tracking-tight" style={{ color: accentColor }}>Trash</h2>
          <p className="font-label-md text-on-surface-variant dark:text-zinc-400 mt-1">
            Restore files and folders moved to Trash
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 pb-6 hide-scrollbar">
        {trashItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6 text-on-surface-variant dark:text-zinc-400">
            <span className="material-symbols-outlined text-[72px] opacity-30 mb-4">delete</span>
            <p className="text-xl font-bold text-on-surface dark:text-zinc-100">Trash Is Empty</p>
            <p className="text-sm max-w-sm mt-2">Deleted items will appear here before they are restored.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_1.4fr_160px_100px_auto] gap-4 px-4 py-2 border-b border-surface-variant dark:border-zinc-800/80 font-label-sm text-[12px] text-outline dark:text-zinc-500 uppercase tracking-wider sticky top-0 bg-white/90 dark:bg-[#161618]/90 backdrop-blur-md z-20">
              <div>Name</div>
              <div>Original Location</div>
              <div>Deleted</div>
              <div className="text-right">Size</div>
              <div className="w-24 text-right">Action</div>
            </div>

            <div className="flex flex-col mt-1 gap-1">
              {trashItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_1.4fr_160px_100px_auto] gap-4 px-4 py-2.5 items-center rounded-xl border border-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <div className="min-w-0 flex items-center gap-3 text-[14px] text-on-surface dark:text-zinc-300">
                    <span className="material-symbols-outlined text-[22px]" style={{ color: accentColor }}>
                      {item.isDirectory ? 'folder' : 'draft'}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </div>
                  <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 truncate" title={item.originalPath}>
                    {item.originalPath}
                  </div>
                  <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 truncate">
                    {formatDate(item.deletedAt)}
                  </div>
                  <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 text-right">
                    {item.isDirectory ? '--' : formatBytes(item.size)}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleRestore(item)}
                      className="h-9 px-3 rounded-xl text-white text-[12px] font-bold active:scale-95 transition-all"
                      style={{ backgroundColor: accentColor }}
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
