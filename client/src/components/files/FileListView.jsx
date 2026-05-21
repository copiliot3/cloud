import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';
import FileIcon from './FileIcon';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';
import { getFileTypeLabel } from '../../utils/fileTypes';
import { SkeletonFileRow } from '../shared/Skeleton';

export default function FileListView() {
  const { items, loading, sortBy, sortDir, setSort, selectedItems, toggleSelect, selectItem, rangeSelect, navigateTo, clipboard, clipboardAction } = useFileStore();
  const { showContextMenu } = useUIStore();

  const handleItemClick = (e, item) => {
    if (e.ctrlKey || e.metaKey) toggleSelect(item.path);
    else if (e.shiftKey) rangeSelect(item.path);
    else selectItem(item.path);
  };

  const handleDoubleClick = (item) => {
    if (item.isDirectory) navigateTo(item.path);
    else window.open(`/api/files/download?path=${encodeURIComponent(item.path)}`, '_blank');
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    if (!selectedItems.has(item.path)) selectItem(item.path);
    showContextMenu(e.clientX, e.clientY, item);
  };

  const SortHeader = ({ label, sortKey, className = '' }) => (
    <div
      onClick={() => setSort(sortKey)}
      className={`cursor-pointer hover:text-on-surface font-medium flex items-center gap-1 ${className}`}
    >
      {label}
      {sortBy === sortKey && (
        <span className="material-symbols-outlined text-[16px]">
          {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
        </span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-[auto_1fr_200px_150px_100px] gap-4 px-4 py-2 border-b border-surface-variant dark:border-zinc-800 font-label-sm text-[12px] text-outline dark:text-zinc-500 uppercase tracking-wider">
          <div className="w-8" />
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-3 w-10" />
        </div>
        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonFileRow key={i} />)}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-8">
      {/* Table Head */}
      <div className="grid grid-cols-[auto_1fr_200px_150px_100px] gap-4 px-4 py-2 border-b border-surface-variant dark:border-zinc-800/80 font-label-sm text-[12px] text-outline dark:text-zinc-500 uppercase tracking-wider sticky top-0 bg-white/90 dark:bg-[#161618]/90 backdrop-blur-md z-20">
        <div className="w-8" />
        <SortHeader label="Name" sortKey="name" />
        <SortHeader label="Date Modified" sortKey="modified" />
        <SortHeader label="Type" sortKey="extension" />
        <SortHeader label="Size" sortKey="size" className="justify-end text-right" />
      </div>

      {/* List Items */}
      <div className="flex flex-col mt-1">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant dark:text-zinc-500">
            <span className="material-symbols-outlined text-[64px] mb-4 opacity-30">folder_open</span>
            <p className="text-lg font-medium">This folder is empty</p>
            <p className="text-sm mt-1">Drop files here or use the upload button</p>
          </div>
        )}

        {items.map((item) => {
          const isSelected = selectedItems.has(item.path);
          const isCut = clipboardAction === 'cut' && clipboard.includes(item.path);
          const { accentColor } = useUIStore.getState();

          return (
            <div
              key={item.path}
              onClick={(e) => handleItemClick(e, item)}
              onDoubleClick={() => handleDoubleClick(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
              className={`
                group grid grid-cols-[auto_1fr_200px_150px_100px] gap-4 px-4 py-2.5 items-center cursor-pointer transition-all duration-200 rounded-xl relative border
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
              {/* Checkbox */}
              <div className="w-8 flex items-center justify-center">
                {isSelected ? (
                  <span className="material-symbols-outlined text-[20px]" style={{ color: accentColor, fontVariationSettings: '"FILL" 1' }}>check_box</span>
                ) : (
                  <span className="material-symbols-outlined text-outline dark:text-zinc-500 text-[20px] opacity-0 group-hover:opacity-100 transition-opacity">
                    check_box_outline_blank
                  </span>
                )}
              </div>

              {/* Name + Icon */}
              <div className={`flex items-center gap-3 font-body-md text-[14px] ${isSelected ? 'font-medium' : 'text-on-surface dark:text-zinc-300'}`}>
                <FileIcon item={item} size="md" animate={false} />
                <span className="truncate" style={isSelected ? { color: accentColor } : {}}>{item.name}</span>
                {item.isStarred && (
                  <span className="material-symbols-outlined text-[16px] text-amber-500 filled shrink-0" title="Starred">star</span>
                )}
              </div>

              {/* Date Modified */}
              <div className="font-body-md text-[13px] text-on-surface-variant dark:text-zinc-400 truncate">
                {formatDate(item.modified)}
              </div>

              {/* Type */}
              <div className="font-body-md text-[13px] text-on-surface-variant dark:text-zinc-400 truncate">
                {getFileTypeLabel(item)}
              </div>

              {/* Size */}
              <div className="font-body-md text-[13px] text-on-surface-variant dark:text-zinc-400 text-right">
                {item.isDirectory ? '--' : formatBytes(item.size)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
