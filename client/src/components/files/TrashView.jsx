import { useEffect, useMemo, useRef, useState } from 'react';
import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';
import { fileApi } from '../../api/fileApi';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';

export default function TrashView() {
  const {
    recycleBinItems,
    recycleBinLoading,
    recycleBinSettings,
    fetchRecycleBin,
    fetchRecycleBinSettings,
    restoreRecycleBinItem,
    deleteRecycleBinItems,
  } = useFileStore();
  const { accentColor, showModal, hideContextMenu } = useUIStore();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
  const menuRef = useRef(null);

  useEffect(() => {
    fetchRecycleBin();
    fetchRecycleBinSettings();
  }, [fetchRecycleBin, fetchRecycleBinSettings]);

  useEffect(() => {
    const validIds = new Set(recycleBinItems.map(item => item.id));
    setSelectedIds((current) => new Set([...current].filter(id => validIds.has(id))));
  }, [recycleBinItems]);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu({ visible: false, x: 0, y: 0, item: null });
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setContextMenu({ visible: false, x: 0, y: 0, item: null });
    };
    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu.visible]);

  const selectedItems = useMemo(
    () => recycleBinItems.filter(item => selectedIds.has(item.id)),
    [recycleBinItems, selectedIds]
  );

  const allSelected = recycleBinItems.length > 0 && selectedIds.size === recycleBinItems.length;

  const toggleSelect = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectOnly = (id) => setSelectedIds(new Set([id]));
  const selectAll = () => setSelectedIds(new Set(recycleBinItems.map(item => item.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const resolveActionItems = (item) => {
    if (item && selectedIds.has(item.id)) return selectedItems;
    if (item) return [item];
    return selectedItems;
  };

  const handleRestore = (items) => {
    if (items.length === 0) return;
    clearSelection();
    items.forEach(item => {
      restoreRecycleBinItem(item.id);
    });
  };

  const handlePermanentDelete = async (items) => {
    if (items.length === 0) return;
    const message = items.length === 1
      ? `Permanently delete "${items[0].name}"? This cannot be undone.`
      : `Permanently delete ${items.length} items? This cannot be undone.`;
    if (!window.confirm(message)) return;
    clearSelection();
    deleteRecycleBinItems(items.map(item => item.id));
  };

  const handleDownload = (items) => {
    const paths = items.map(item => item.binPath);
    if (paths.length > 1) window.open(fileApi.getMultiDownloadUrl(paths), '_blank');
    else if (paths[0]) window.open(fileApi.getDownloadUrl(paths[0]), '_blank');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
      } else if (e.key === 'Delete' && selectedItems.length > 0) {
        e.preventDefault();
        handlePermanentDelete(selectedItems);
      } else if (e.key === 'Enter' && selectedItems.length > 0) {
        e.preventDefault();
        handleRestore(selectedItems);
      } else if (e.key === 'Escape') {
        clearSelection();
        setContextMenu({ visible: false, x: 0, y: 0, item: null });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems]);

  const handleInfo = (item) => {
    showModal('properties', {
      item: {
        ...item,
        path: item.binPath,
        originalPath: item.originalPath,
      },
    });
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    hideContextMenu();
    if (!selectedIds.has(item.id)) selectOnly(item.id);
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item });
  };

  const MenuItem = ({ label, shortcut, onClick, danger = false }) => (
    <button
      onClick={() => {
        onClick();
        setContextMenu({ visible: false, x: 0, y: 0, item: null });
      }}
      className={`w-full px-3 py-1.5 flex items-center justify-between text-[13px] font-medium text-left rounded-[8px] group transition-all duration-150 ${
        danger ? 'text-error hover:bg-error hover:text-white hover:shadow-lg hover:shadow-error/20 active:scale-95' : 'text-on-surface dark:text-zinc-200 accent-hover-button'
      }`}
      style={!danger ? { '--accent': accentColor, '--accent-glow': `${accentColor}33` } : {}}
    >
      <span>{label}</span>
      {shortcut && <span className="text-[11.5px] opacity-45 group-hover:text-white/80 group-hover:opacity-100 transition-all font-semibold">{shortcut}</span>}
    </button>
  );

  const Divider = () => <div className="h-px bg-black/[0.05] dark:bg-white/[0.06] mx-2 my-1.5" />;

  if (recycleBinLoading) {
    return (
      <div className="flex-1 px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-[32px] animate-pulse" style={{ color: accentColor }}>delete</span>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight" style={{ color: accentColor }}>Recycle Bin</h2>
            <div className="skeleton h-3.5 w-64 mt-1.5" />
          </div>
        </div>
      </div>
    );
  }

  const menuWidth = 230;
  const menuHeight = 230;
  const adjustedX = contextMenu.x + menuWidth > window.innerWidth ? contextMenu.x - menuWidth : contextMenu.x;
  const adjustedY = contextMenu.y + menuHeight > window.innerHeight ? contextMenu.y - menuHeight : contextMenu.y;
  const actionItems = resolveActionItems(contextMenu.item);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 py-6" onClick={() => setContextMenu({ visible: false, x: 0, y: 0, item: null })}>
      <div className="mb-6 shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-[32px]" style={{ color: accentColor }}>delete</span>
          <div className="min-w-0">
            <h2 className="text-[28px] font-bold tracking-tight" style={{ color: accentColor }}>Recycle Bin</h2>
            <p className="font-label-md text-on-surface-variant dark:text-zinc-400 mt-1">
              Items are permanently removed after {recycleBinSettings.retentionDays || 30} days
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={allSelected ? clearSelection : selectAll}
            disabled={recycleBinItems.length === 0}
            className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-40 text-[13px] font-bold transition-all"
          >
            {allSelected ? 'Clear' : 'Select All'}
          </button>
          <button
            onClick={() => handleRestore(selectedItems)}
            disabled={selectedItems.length === 0}
            className="h-10 px-4 rounded-xl text-white disabled:opacity-40 text-[13px] font-bold transition-all active:scale-95 flex items-center gap-2"
            style={{ backgroundColor: accentColor }}
          >
            Restore
          </button>
          <button
            onClick={() => handlePermanentDelete(selectedItems)}
            disabled={selectedItems.length === 0}
            className="h-10 px-4 rounded-xl bg-error text-white disabled:opacity-40 text-[13px] font-bold transition-all active:scale-95"
          >
            Delete Permanently
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 pb-6 hide-scrollbar">
        {recycleBinItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6 text-on-surface-variant dark:text-zinc-400">
            <span className="material-symbols-outlined text-[72px] opacity-30 mb-4">delete</span>
            <p className="text-xl font-bold text-on-surface dark:text-zinc-100">Recycle Bin Is Empty</p>
            <p className="text-sm max-w-sm mt-2">Deleted items will appear here until they are restored or permanently removed.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[auto_1fr_1.3fr_150px_150px_100px] gap-4 px-4 py-2 border-b border-surface-variant dark:border-zinc-800/80 font-label-sm text-[12px] text-outline dark:text-zinc-500 uppercase tracking-wider sticky top-0 bg-white/90 dark:bg-[#161618]/90 backdrop-blur-md z-20">
              <button onClick={allSelected ? clearSelection : selectAll} className="w-8 flex justify-center" title="Select all">
                <span className="material-symbols-outlined text-[19px]" style={allSelected ? { color: accentColor, fontVariationSettings: '"FILL" 1' } : {}}>
                  {allSelected ? 'check_box' : 'check_box_outline_blank'}
                </span>
              </button>
              <div>Name</div>
              <div>Original Location</div>
              <div>Deleted</div>
              <div>Auto Delete</div>
              <div className="text-right">Size</div>
            </div>

            <div className="flex flex-col mt-1 gap-1">
              {recycleBinItems.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                const delay = `${Math.min(index, 30) * 18}ms`;
                return (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.ctrlKey || e.metaKey) toggleSelect(item.id);
                      else selectOnly(item.id);
                    }}
                    onDoubleClick={() => handleRestore([item])}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className={`group grid grid-cols-[auto_1fr_1.3fr_150px_150px_100px] gap-4 px-4 py-2.5 items-center rounded-xl border cursor-pointer transition-all animate-file-appear ${
                      isSelected ? '' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    style={isSelected ? {
                      backgroundColor: `${accentColor}1C`,
                      borderColor: `${accentColor}66`,
                      boxShadow: `0 4px 12px ${accentColor}1D`,
                      animationDelay: delay,
                    } : { animationDelay: delay }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                      className="w-8 flex items-center justify-center"
                      title={isSelected ? 'Deselect' : 'Select'}
                    >
                      <span className="material-symbols-outlined text-[20px]" style={isSelected ? { color: accentColor, fontVariationSettings: '"FILL" 1' } : {}}>
                        {isSelected ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                    </button>
                    <div className="min-w-0 flex items-center gap-3 text-[14px] text-on-surface dark:text-zinc-300">
                      <span className="material-symbols-outlined text-[22px]" style={{ color: accentColor }}>
                        {item.isDirectory ? 'folder' : 'draft'}
                      </span>
                      <span className="truncate" style={isSelected ? { color: accentColor } : {}}>{item.name}</span>
                    </div>
                    <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 truncate" title={item.originalPath}>
                      {item.originalPath}
                    </div>
                    <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 truncate">
                      {formatDate(item.deletedAt)}
                    </div>
                    <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 truncate">
                      {item.expiresAt ? formatDate(item.expiresAt) : '--'}
                    </div>
                    <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 text-right">
                      {item.isDirectory ? '--' : formatBytes(item.size)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {contextMenu.visible && (
        <div className="fixed inset-0 z-[80]" onContextMenu={(e) => e.preventDefault()}>
          <div
            ref={menuRef}
            className="absolute w-[220px] glass-menu rounded-[20px] py-2 px-2 animate-menu-in"
            style={{ left: adjustedX, top: adjustedY }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem label="Restore" onClick={() => handleRestore(actionItems)} />
            <MenuItem label="Get Info" onClick={() => handleInfo(contextMenu.item)} />
            <MenuItem label="Download" onClick={() => handleDownload(actionItems)} />
            <Divider />
            <MenuItem label="Select" onClick={() => selectOnly(contextMenu.item.id)} />
            <MenuItem label="Select All" onClick={selectAll} shortcut="Ctrl A" />
            <Divider />
            <MenuItem label="Delete Permanently" onClick={() => handlePermanentDelete(actionItems)} danger />
          </div>
        </div>
      )}
    </div>
  );
}
