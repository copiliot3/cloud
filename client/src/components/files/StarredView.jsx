import { useEffect } from 'react';
import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';
import FileIcon from './FileIcon';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';
import { getFileTypeLabel } from '../../utils/fileTypes';

export default function StarredView() {
  const { 
    starredItems, 
    starredLoading, 
    fetchStarred, 
    toggleStar, 
    navigateTo,
    selectedItems,
    toggleSelect,
    selectItem,
    rangeSelect,
    clipboard,
    clipboardAction
  } = useFileStore();
  const { accentColor, showContextMenu, setCurrentView } = useUIStore();

  useEffect(() => {
    fetchStarred();
  }, [fetchStarred]);

  const handleItemClick = (e, item) => {
    if (e.ctrlKey || e.metaKey) toggleSelect(item.path);
    else if (e.shiftKey) rangeSelect(item.path);
    else selectItem(item.path);
  };

  const handleDoubleClick = (item) => {
    if (item.isDirectory) {
      navigateTo(item.path);
      setCurrentView('files');
    } else {
      window.open(`/api/files/download?path=${encodeURIComponent(item.path)}`, '_blank');
    }
  };

  const handleLocate = (item) => {
    if (item.isDirectory) {
      navigateTo(item.path);
      setCurrentView('files');
    } else {
      const lastSlash = item.path.lastIndexOf('\\');
      if (lastSlash !== -1) {
        const parentDir = item.path.substring(0, lastSlash);
        navigateTo(parentDir);
        setCurrentView('files');
        // Let directory load, then select item
        setTimeout(() => {
          useFileStore.getState().selectItem(item.path);
        }, 400);
      }
    }
  };

  const handleUnstar = async (e, item) => {
    e.stopPropagation();
    await toggleStar(item);
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    useFileStore.getState().selectItem(item.path);
    showContextMenu(e.clientX, e.clientY, item);
  };

  if (starredLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Title */}
        <div className="mb-6 shrink-0 flex items-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-amber-500 filled animate-pulse">star</span>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight animate-pulse" style={{ color: accentColor }}>
              Starred
            </h2>
            <div className="skeleton h-3.5 w-64 mt-1.5" />
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr_1.5fr_200px_150px_100px] gap-4 px-4 py-2 border-b border-surface-variant dark:border-zinc-800 font-label-sm text-[12px] text-outline dark:text-zinc-500 uppercase tracking-wider">
          <div className="w-8" />
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-10 text-right" />
        </div>

        <div className="flex flex-col mt-1 gap-1.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="grid grid-cols-[auto_1fr_1.5fr_200px_150px_100px] gap-4 px-4 py-3 items-center border border-transparent rounded-xl animate-pulse">
              <div className="w-8 flex justify-center"><div className="skeleton w-5 h-5 rounded-full" /></div>
              <div className="flex items-center gap-3"><div className="skeleton w-6 h-6 rounded" /><div className="skeleton h-3 w-24" /></div>
              <div className="skeleton h-3 w-40" />
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-3 w-12 justify-self-end" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 py-6">
      {/* Title */}
      <div className="mb-6 shrink-0 flex items-center gap-3">
        <span className="material-symbols-outlined text-[32px] text-amber-500 filled">star</span>
        <div>
          <h2 className="text-[28px] font-bold tracking-tight" style={{ color: accentColor }}>
            Starred
          </h2>
          <p className="font-label-md text-on-surface-variant dark:text-zinc-400 mt-1">
            Access your most important files and folders quickly
          </p>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-y-auto pr-1 pb-6 hide-scrollbar flex flex-col">
        {starredItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <span className="material-symbols-outlined text-[72px] text-amber-500 filled select-none relative z-10">
                star
              </span>
            </div>
            <p className="text-xl font-bold text-on-surface dark:text-zinc-100">No Starred Items</p>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 max-w-sm mt-2">
              Right-click any folder or file and select <strong style={{ color: accentColor }}>Star</strong> to keep it pinned in this section.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Table Head */}
            <div className="grid grid-cols-[auto_1fr_1.5fr_200px_150px_100px] gap-4 px-4 py-2 border-b border-surface-variant dark:border-zinc-800/80 font-label-sm text-[12px] text-outline dark:text-zinc-500 uppercase tracking-wider sticky top-0 bg-white/90 dark:bg-[#161618]/90 backdrop-blur-md z-20">
              <div className="w-8" />
              <div className="font-medium text-on-surface dark:text-zinc-300">Name</div>
              <div className="font-medium text-on-surface dark:text-zinc-300">Location</div>
              <div className="font-medium text-on-surface dark:text-zinc-300">Date Modified</div>
              <div className="font-medium text-on-surface dark:text-zinc-300">Type</div>
              <div className="font-medium text-on-surface dark:text-zinc-300 text-right pr-2">Size</div>
            </div>

            {/* List Items */}
            <div className="flex flex-col mt-1 gap-1">
              {starredItems.map((item) => {
                const isSelected = selectedItems.has(item.path);
                const isCut = clipboardAction === 'cut' && clipboard.includes(item.path);

                return (
                  <div
                    key={item.path}
                    onClick={(e) => handleItemClick(e, item)}
                    onDoubleClick={() => handleDoubleClick(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className={`
                      group grid grid-cols-[auto_1fr_1.5fr_200px_150px_100px] gap-4 px-4 py-2.5 items-center cursor-pointer transition-all duration-200 rounded-xl relative border
                      ${isSelected
                        ? ''
                        : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                      }
                      ${isCut ? 'opacity-50 grayscale-[0.3]' : ''}
                    `}
                    style={isSelected ? { 
                      backgroundColor: `${accentColor}1C`, 
                      borderColor: `${accentColor}66`,
                      boxShadow: `0 4px 12px ${accentColor}1D`
                    } : {}}
                  >
                    {/* Star Icon / Unstar Action */}
                    <div className="w-8 flex items-center justify-center">
                      <button
                        onClick={(e) => handleUnstar(e, item)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-amber-500 hover:bg-amber-500/10 transition-all active:scale-90"
                        title="Unstar Item"
                      >
                        <span className="material-symbols-outlined text-[18px] filled select-none">star</span>
                      </button>
                    </div>

                    {/* Name + Icon */}
                    <div className={`flex items-center gap-3 font-body-md text-[14px] ${isSelected ? 'font-medium' : 'text-on-surface dark:text-zinc-300'} truncate`}>
                      <FileIcon item={item} size="md" animate={false} />
                      <span className="truncate" style={isSelected ? { color: accentColor } : {}}>{item.name}</span>
                    </div>

                    {/* Location / Path */}
                    <div 
                      className="font-body-md text-[13px] text-on-surface-variant/80 dark:text-zinc-400 truncate flex items-center gap-1.5 hover:underline" 
                      onClick={(e) => { e.stopPropagation(); handleLocate(item); }} 
                      title="Click to locate in Folders"
                    >
                      <span className="material-symbols-outlined text-[14px] opacity-70 shrink-0">folder_open</span>
                      <span className="truncate">{item.path}</span>
                    </div>

                    {/* Date Modified */}
                    <div className="font-body-md text-[13px] text-on-surface-variant/75 dark:text-zinc-400 truncate">
                      {formatDate(item.modified)}
                    </div>

                    {/* Type */}
                    <div className="font-body-md text-[13px] text-on-surface-variant/75 dark:text-zinc-400 truncate">
                      {item.isDirectory ? 'Folder' : getFileTypeLabel(item)}
                    </div>

                    {/* Size */}
                    <div className="font-body-md text-[13px] text-on-surface-variant/75 dark:text-zinc-400 text-right pr-2">
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
