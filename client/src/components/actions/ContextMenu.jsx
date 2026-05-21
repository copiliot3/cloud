import { useEffect, useRef } from 'react';
import useUIStore from '../../stores/useUIStore';
import useFileStore from '../../stores/useFileStore';
import { fileApi } from '../../api/fileApi';

export default function ContextMenu() {
  const { contextMenu, hideContextMenu, showModal, addToast, accentColor } = useUIStore();
  const { refresh, copyToClipboard, cutToClipboard, paste, selectedItems, deleteFiles } = useFileStore();
  const { setCustomFolderColor } = useUIStore();
  const menuRef = useRef(null);

  const FOLDER_COLORS = [
    { name: 'Blue', value: '#3fa0f6' },
    { name: 'Yellow', value: '#fdd835' },
    { name: 'Green', value: '#66bb6a' },
    { name: 'Red', value: '#ef5350' },
    { name: 'Purple', value: '#ab47bc' },
    { name: 'Graphite', value: '#78909c' },
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        hideContextMenu();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') hideContextMenu();
    };
    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu.visible, hideContextMenu]);

  if (!contextMenu.visible) return null;

  const { x, y, item } = contextMenu;

  // Adjust position to stay within viewport
  const menuWidth = 240;
  const menuHeight = 280;
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  const handleOpen = () => {
    if (item.isDirectory) {
      useFileStore.getState().navigateTo(item.path);
    } else {
      window.open(`/api/files/download?path=${encodeURIComponent(item.path)}`, '_blank');
    }
    hideContextMenu();
  };

  const handleDownload = () => {
    const paths = selectedItems.has(item.path) ? [...selectedItems] : [item.path];
    if (paths.length > 1) {
      window.open(fileApi.getMultiDownloadUrl(paths), '_blank');
    } else {
      window.open(fileApi.getDownloadUrl(item.path), '_blank');
    }
    hideContextMenu();
  };

  const handleCopy = () => {
    copyToClipboard();
    addToast('Copied to clipboard', 'info');
    hideContextMenu();
  };

  const handleCut = () => {
    cutToClipboard();
    addToast('Cut to clipboard', 'info');
    hideContextMenu();
  };

  const handlePaste = async () => {
    const result = await paste();
    if (result?.success) addToast('Items pasted successfully');
    else if (result?.error) addToast(result.error, 'error');
    hideContextMenu();
  };

  const handleRename = () => {
    showModal('rename', {
      name: item.name,
      onConfirm: async (newName) => {
        try {
          await fileApi.rename(item.path, newName);
          addToast(`Renamed to "${newName}"`);
          refresh();
        } catch (err) {
          addToast(err.message, 'error');
        }
      },
    });
    hideContextMenu();
  };

  const handleDelete = () => {
    const paths = selectedItems.has(item.path) ? [...selectedItems] : [item.path];
    showModal('delete', {
      count: paths.length,
      onConfirm: () => deleteFiles(paths),
    });
    hideContextMenu();
  };

  const MenuItem = ({ label, shortcut, onClick, danger = false }) => (
    <button
      onClick={onClick}
      className={`
        w-full px-3 py-1.5 flex items-center justify-between text-[13px] font-medium
        text-left rounded-[8px] group transition-all duration-150
        ${danger ? 'text-error hover:bg-error hover:text-white hover:shadow-lg hover:shadow-error/20 active:scale-95' : 'text-on-surface dark:text-zinc-200 accent-hover-button'}
      `}
      style={!danger ? { '--accent': accentColor, '--accent-glow': `${accentColor}33` } : {}}
    >
      <span>{label}</span>
      {shortcut && <span className="text-[11.5px] opacity-45 group-hover:text-white/80 group-hover:opacity-100 transition-all font-semibold">{shortcut}</span>}
    </button>
  );

  const Divider = () => <div className="h-px bg-black/[0.05] dark:bg-white/[0.06] mx-2 my-1.5"></div>;

  return (
    <div className="fixed inset-0 z-[80]" onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={menuRef}
        className="absolute w-[220px] glass-menu rounded-[20px] py-2 px-2 animate-menu-in"
        style={{ left: adjustedX, top: adjustedY }}
      >
        <MenuItem label="Open" onClick={handleOpen} shortcut="Ctrl O" />
        <MenuItem label="Get Info" onClick={() => { showModal('properties', { item }); hideContextMenu(); }} shortcut="Ctrl I" />
        <MenuItem label="Download" onClick={handleDownload} />
        <MenuItem label="Share" onClick={() => { showModal('share', { item }); hideContextMenu(); }} />
        <MenuItem 
          label={item.isStarred ? '★ Unstar' : '☆ Star'} 
          onClick={async () => {
            const res = await useFileStore.getState().toggleStar(item);
            if (res.success) {
              addToast(item.isStarred ? 'Removed from Starred' : 'Added to Starred', 'success');
            } else {
              addToast(res.error || 'Failed to update star', 'error');
            }
            hideContextMenu();
          }} 
        />
        
        <Divider />
        
        <MenuItem label="Cut" onClick={handleCut} shortcut="Ctrl X" />
        <MenuItem label="Copy" onClick={handleCopy} shortcut="Ctrl C" />
        <MenuItem label="Paste" onClick={handlePaste} shortcut="Ctrl V" />
        
        <Divider />
        
        <MenuItem label="Rename" onClick={handleRename} shortcut="F2" />
        <MenuItem label="Move to..." onClick={handleCut} />
        
        {item.isDirectory && (
          <>
            <Divider />
            <div className="px-3 py-1 text-[10px] font-bold text-black/30 dark:text-zinc-500 uppercase tracking-wider">Folder Color</div>
            <div className="flex px-3 py-1.5 gap-2 flex-wrap max-w-[200px]">
              {FOLDER_COLORS.map(c => (
                <button 
                  key={c.name}
                  onClick={() => { setCustomFolderColor(item.path, c.value); hideContextMenu(); }}
                  className="w-5 h-5 rounded-full border border-black/5 dark:border-zinc-800 hover:scale-110 active:scale-95 transition-transform"
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
              <button 
                onClick={() => { setCustomFolderColor(item.path, null); hideContextMenu(); }}
                className="w-5 h-5 rounded-full border border-black/10 dark:border-zinc-700 flex items-center justify-center bg-white dark:bg-zinc-800 hover:scale-110 active:scale-95 transition-transform"
                title="Reset to Default"
              >
                <div className="w-px h-3 bg-red-500 rotate-45" />
              </button>
            </div>
          </>
        )}

        <Divider />
        
        <MenuItem label="Delete" onClick={handleDelete} danger shortcut="Del" />
      </div>
    </div>
  );
}
