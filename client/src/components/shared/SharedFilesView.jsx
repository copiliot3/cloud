import { useMemo, useRef } from 'react';
import FileIcon from '../files/FileIcon';
import SharedBreadcrumb from '../navigation/SharedBreadcrumb';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';
import { shareApi } from '../../api/shareApi';
import useUIStore from '../../stores/useUIStore';
import useSearchStore from '../../stores/useSearchStore';
import { VIEW_MODES } from '../../utils/constants';

export default function SharedFilesView({
  items,
  relativePath,
  shareId,
  canWrite,
  canRead,
  selectedItems,
  onNavigate,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onDelete,
  onRename,
  share,
  busy,
  viewMode,
}) {
  const { addToast, showContextMenu, hideContextMenu, showModal } = useUIStore();
  const { query } = useSearchStore();
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const parts = relativePath ? relativePath.split(/[\\/]/).filter(Boolean) : [];
    return [
      { label: share?.item?.name || 'Shared', path: '' },
      ...parts.map((part, index) => ({
        label: part,
        path: parts.slice(0, index + 1).join('/'),
      })),
    ];
  }, [relativePath, share]);

  const handleBreadcrumbClick = (path) => {
    onNavigate(path);
  };

  const handleItemClick = (item, e) => {
    if (e.ctrlKey || e.metaKey) {
      onToggleSelection(item.relativePath);
    } else if (e.shiftKey && selectedItems.size > 0) {
      // Shift-click to select range (simplified for now)
      onToggleSelection(item.relativePath);
    } else {
      // Regular click
      if (item.isDirectory) {
        onNavigate(item.relativePath);
      } else {
        showModal('properties', { item });
      }
    }
  };

  const handleContextMenu = (item, e) => {
    e.preventDefault();
    if (!selectedItems.has(item.relativePath)) {
      onClearSelection();
      onToggleSelection(item.relativePath);
    }
    showContextMenu(e.clientX, e.clientY, item, {
      isShared: true,
      canWrite,
      showGetInfo: true,
      selectedItems,
      itemKey: 'relativePath',
      onOpen: () => {
        if (item.isDirectory) onNavigate(item.relativePath);
        else showModal('properties', { item });
      },
      downloadUrl: item.isDirectory
        ? shareApi.zipUrl(shareId, item.relativePath)
        : shareApi.rawUrl(shareId, item.relativePath),
      onRename: () => {
        if (!canWrite || typeof onRename !== 'function') return;
        if (selectedItems.size === 1) {
          showModal('rename', {
            name: item.name,
            onConfirm: (newName) => {
              if (newName) {
                onRename(item.relativePath, newName);
              }
            },
          });
        }
      },
      onDelete: () => {
        if (!canWrite || typeof onDelete !== 'function') return;
        const paths = [...selectedItems];
        showModal('delete', {
          count: paths.length,
          onConfirm: () => onDelete(paths),
        });
      },
    });
  };

  const handleEmptyClick = (e) => {
    if (e.target === e.currentTarget) {
      onClearSelection();
    }
  };

  const handleDragOver = (e) => {
    if (!canWrite) return;
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-50', 'dark:bg-blue-900/20');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
  };

  const handleDrop = async (e) => {
    if (!canWrite) return;
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');

    const files = [...e.dataTransfer.files];
    if (files.length === 0) return;

    try {
      await shareApi.upload(shareId, relativePath, files);
      addToast(`${files.length} file(s) uploaded successfully`);
      onNavigate(relativePath);
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    }
  };

  if (!canRead) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <span className="material-symbols-outlined text-[64px] text-error mb-4">
            lock
          </span>
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-2">
            You do not have permission to view this folder
          </p>
        </div>
      </div>
    );
  }

  // Filter items for search
  const filteredItems = useMemo(() => {
    if (!query || !query.trim()) return items;
    const searchTerm = query.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm)
    );
  }, [items, query]);

  if (items.length === 0 && !query) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Breadcrumb */}
        <SharedBreadcrumb
          breadcrumbs={breadcrumbs}
          onNavigate={handleBreadcrumbClick}
        />

        {/* Empty state */}
        <div
          className="flex-1 flex items-center justify-center p-8 transition-colors cursor-default"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleEmptyClick}
        >
          <div className="text-center">
            <span className="material-symbols-outlined text-[64px] text-black/20 dark:text-white/10 mb-4">
              folder_open
            </span>
            <h2 className="text-lg font-semibold text-on-surface-variant dark:text-zinc-400">
              Folder is empty
            </h2>
            {canWrite && (
              <p className="text-sm text-on-surface-variant dark:text-zinc-500 mt-1">
                Drop files here to upload
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show search results state
  if (query && filteredItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <SharedBreadcrumb
          breadcrumbs={breadcrumbs}
          onNavigate={handleBreadcrumbClick}
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <span className="material-symbols-outlined text-[64px] text-black/20 dark:text-white/10 mb-4">
              search_off
            </span>
            <h2 className="text-lg font-semibold text-on-surface-variant dark:text-zinc-400">
              No results found
            </h2>
            <p className="text-sm text-on-surface-variant dark:text-zinc-500 mt-1">
              Try a different search term
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Breadcrumb */}
      <SharedBreadcrumb
        breadcrumbs={breadcrumbs}
        onNavigate={handleBreadcrumbClick}
      />

{/* Files Container */}
       <div className="flex-1 overflow-auto px-8 py-4">
         {viewMode === VIEW_MODES.GRID ? (
           // Grid View
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
             {filteredItems.map((item) => (
               <div
                 key={item.relativePath}
                onClick={(e) => handleItemClick(item, e)}
                onContextMenu={(e) => handleContextMenu(item, e)}
                className={`group relative p-4 rounded-2xl transition-all cursor-pointer border-2 ${
                  selectedItems.has(item.relativePath)
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/10 dark:hover:border-white/10'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  {/* Icon with selection indicator */}
                  <div className="relative">
                    <FileIcon item={item} size="lg" />
                    {selectedItems.has(item.relativePath) && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-[16px] text-white"
                          style={{ fontVariationSettings: '"FILL" 1' }}
                        >
                          check
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <p
                    className="text-sm font-medium text-center truncate w-full"
                    title={item.name}
                  >
                    {item.name}
                  </p>

                  {/* Size/Type */}
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400 text-center">
                    {item.isDirectory
                      ? `${item.childCount || 0} items`
                      : formatBytes(item.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
) : (
           // List View
           <div className="space-y-1">
             {filteredItems.map((item) => (
               <div
                key={item.relativePath}
                onClick={(e) => handleItemClick(item, e)}
                onContextMenu={(e) => handleContextMenu(item, e)}
                className={`group px-4 py-3 rounded-lg transition-all cursor-pointer flex items-center gap-3 border ${
                  selectedItems.has(item.relativePath)
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {/* Selection checkbox */}
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selectedItems.has(item.relativePath)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {selectedItems.has(item.relativePath) && (
                    <span
                      className="material-symbols-outlined text-[16px] text-white"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                    >
                      check
                    </span>
                  )}
                </div>

                {/* Icon */}
                <FileIcon item={item} size="sm" />

                {/* Name and details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400">
                    {item.isDirectory
                      ? `${item.childCount || 0} items`
                      : formatBytes(item.size)}{' '}
                    • {formatDate(item.modified)}
                  </p>
                </div>

                {/* Type indicator */}
                <div className="text-xs font-medium text-on-surface-variant dark:text-zinc-400 hidden sm:block">
                  {item.isDirectory ? 'Folder' : (item.extension || 'File')}
                </div>

                {/* Download button for files */}
                {!item.isDirectory && (
                  <a
                    href={shareApi.rawUrl(shareId, item.relativePath)}
                    onClick={(e) => e.stopPropagation()}
                    download
                    className="flex-shrink-0 h-8 w-8 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    title="Download"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      download
                    </span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

{/* Info bar */}
       <div className="border-t border-black/10 dark:border-white/10 px-8 py-3 text-sm text-on-surface-variant dark:text-zinc-400 flex items-center justify-between">
         <span>
           {query ? `${filteredItems.length} result${filteredItems.length !== 1 ? 's' : ''}` : `${items.length} item${items.length !== 1 ? 's' : ''}`} •{' '}
           {selectedItems.size > 0 && `${selectedItems.size} selected`}
         </span>
         <span className="text-xs">
           Permission: <strong>{canWrite ? 'Read & Write' : 'Read Only'}</strong>
         </span>
       </div>
    </div>
  );
}
