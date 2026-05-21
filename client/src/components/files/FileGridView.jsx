import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';
import FileIcon from './FileIcon';

export default function FileGridView() {
  const { items, loading, selectedItems, toggleSelect, selectItem, rangeSelect, navigateTo, clipboard, clipboardAction } = useFileStore();
  const { showContextMenu } = useUIStore();

  const handleItemClick = (e, item) => {
    if (e.ctrlKey || e.metaKey) {
      toggleSelect(item.path);
    } else if (e.shiftKey) {
      rangeSelect(item.path);
    } else {
      selectItem(item.path);
    }
  };

  const handleDoubleClick = (item) => {
    if (item.isDirectory) {
      navigateTo(item.path);
    } else {
      window.open(`/api/files/download?path=${encodeURIComponent(item.path)}`, '_blank');
    }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    if (!selectedItems.has(item.path)) {
      selectItem(item.path);
    }
    showContextMenu(e.clientX, e.clientY, item);
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-x-6 gap-y-10">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="flex flex-col items-center">
              <div className="skeleton w-16 h-16 rounded-xl mb-3" />
              <div className="skeleton h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant dark:text-zinc-500">
        <span className="material-symbols-outlined text-[64px] mb-4 opacity-30">folder_open</span>
        <p className="text-lg font-medium">This folder is empty</p>
        <p className="text-sm mt-1">Drop files here or use the upload button</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-10 py-6">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-x-6 gap-y-8">
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
                group flex flex-col items-center p-3.5 rounded-2xl cursor-pointer transition-all duration-200 relative border
                ${isSelected
                  ? ''
                  : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/5 dark:hover:border-white/5'
                }
                ${isCut ? 'opacity-50 grayscale-[0.3]' : ''}
              `}
              style={isSelected ? { 
                backgroundColor: `${accentColor}22`, 
                borderColor: `${accentColor}80`,
                boxShadow: `0 8px 24px -4px ${accentColor}3D`
              } : {}}
            >
              {/* Icon Container */}
              <div className={`relative mb-2 transition-transform ${isSelected ? '' : 'group-hover:scale-[1.02]'}`}>
                <FileIcon item={item} size="xl" />
                {item.isStarred && (
                  <span className="absolute -top-1 -right-1 material-symbols-outlined text-[18px] text-amber-500 filled bg-white dark:bg-zinc-800 rounded-full p-0.5 shadow-sm border border-black/5 dark:border-white/5" title="Starred">star</span>
                )}
              </div>

              {/* Text block (NO background on select) */}
              <div className="w-full flex justify-center px-1">
                <p 
                  className={`text-[13px] text-center line-clamp-2 px-1 break-words max-w-[120px] ${
                    isSelected ? 'font-medium' : 'text-on-surface dark:text-zinc-300 font-medium'
                  }`}
                  style={isSelected ? { color: accentColor } : {}}
                  title={item.name}
                >
                  {item.name}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

