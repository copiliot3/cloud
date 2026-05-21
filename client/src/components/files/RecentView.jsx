import { useEffect } from 'react';
import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';
import FileIcon from './FileIcon';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';
import { getFileTypeLabel } from '../../utils/fileTypes';

const ACTION_LABELS = {
  opened: 'Opened',
  viewed: 'Viewed',
  downloaded: 'Downloaded',
  searched: 'Opened from search',
};

export default function RecentView() {
  const {
    recentItems,
    recentLoading,
    fetchRecent,
    navigateTo,
    selectedItems,
    selectItem,
    toggleSelect,
    rangeSelect,
  } = useFileStore();
  const { accentColor, showContextMenu, setCurrentView } = useUIStore();

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const handleItemClick = (e, item) => {
    if (e.ctrlKey || e.metaKey) toggleSelect(item.path);
    else if (e.shiftKey) rangeSelect(item.path);
    else selectItem(item.path);
  };

  const handleOpen = (item) => {
    if (item.isDirectory) {
      setCurrentView('files');
      navigateTo(item.path);
    } else {
      const parent = item.path.substring(0, item.path.lastIndexOf('\\'));
      if (parent) {
        setCurrentView('files');
        navigateTo(parent);
        setTimeout(() => useFileStore.getState().selectItem(item.path), 350);
      }
    }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    selectItem(item.path);
    showContextMenu(e.clientX, e.clientY, item);
  };

  if (recentLoading) {
    return (
      <div className="flex-1 px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-[32px] animate-pulse" style={{ color: accentColor }}>schedule</span>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight" style={{ color: accentColor }}>Recent</h2>
            <div className="skeleton h-3.5 w-56 mt-1.5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 py-6">
      <div className="mb-6 shrink-0 flex items-center gap-3">
        <span className="material-symbols-outlined text-[32px]" style={{ color: accentColor }}>schedule</span>
        <div>
          <h2 className="text-[28px] font-bold tracking-tight" style={{ color: accentColor }}>Recent</h2>
          <p className="font-label-md text-on-surface-variant dark:text-zinc-400 mt-1">
            Files and folders you opened, viewed, downloaded, or found through search
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 pb-6 hide-scrollbar">
        {recentItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6 text-on-surface-variant dark:text-zinc-400">
            <span className="material-symbols-outlined text-[72px] opacity-30 mb-4">schedule</span>
            <p className="text-xl font-bold text-on-surface dark:text-zinc-100">No Recent Activity</p>
            <p className="text-sm max-w-sm mt-2">Open, inspect, download, or search for files and they will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[auto_1fr_1.4fr_160px_160px_100px] gap-4 px-4 py-2 border-b border-surface-variant dark:border-zinc-800/80 font-label-sm text-[12px] text-outline dark:text-zinc-500 uppercase tracking-wider sticky top-0 bg-white/90 dark:bg-[#161618]/90 backdrop-blur-md z-20">
              <div className="w-8" />
              <div>Name</div>
              <div>Location</div>
              <div>Activity</div>
              <div>Modified</div>
              <div className="text-right pr-2">Size</div>
            </div>

            <div className="flex flex-col mt-1 gap-1">
              {recentItems.map((item) => {
                const isSelected = selectedItems.has(item.path);
                return (
                  <div
                    key={item.path}
                    onClick={(e) => handleItemClick(e, item)}
                    onDoubleClick={() => handleOpen(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className={`group grid grid-cols-[auto_1fr_1.4fr_160px_160px_100px] gap-4 px-4 py-2.5 items-center cursor-pointer transition-all duration-200 rounded-xl border ${
                      isSelected ? '' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    style={isSelected ? {
                      backgroundColor: `${accentColor}1C`,
                      borderColor: `${accentColor}66`,
                      boxShadow: `0 4px 12px ${accentColor}1D`,
                    } : {}}
                  >
                    <div className="w-8 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px] opacity-45">history</span>
                    </div>
                    <div className="flex items-center gap-3 text-[14px] text-on-surface dark:text-zinc-300 min-w-0">
                      <FileIcon item={item} size="md" animate={false} />
                      <span className="truncate" style={isSelected ? { color: accentColor } : {}}>{item.name}</span>
                    </div>
                    <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 truncate" title={item.path}>
                      {item.path}
                    </div>
                    <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 truncate">
                      {ACTION_LABELS[item.action] || getFileTypeLabel(item)}
                    </div>
                    <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 truncate">
                      {formatDate(item.modified)}
                    </div>
                    <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 text-right pr-2">
                      {item.isDirectory ? '--' : formatBytes(item.size)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
