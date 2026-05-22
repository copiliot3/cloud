import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { shareApi } from '../../api/shareApi';
import FileIcon from '../files/FileIcon';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';
import useUIStore from '../../stores/useUIStore';

export default function SharedView({ shareId }) {
  const { accentColor } = useUIStore();
  
  const [share, setShare] = useState(null);
  const [items, setItems] = useState([]);
  const [relativePath, setRelativePath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  // Custom local state for navigation history and scoped search
  const [pathHistory, setPathHistory] = useState(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const canWrite = share?.permission === 'write' && share?.isDirectory;
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < pathHistory.length - 1;
  const canGoUp = !!relativePath;

  const load = useCallback(async (path = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await shareApi.get(shareId);
      setShare(data.share);
      if (data.share.isDirectory) {
        const listing = await shareApi.list(shareId, path);
        setItems(listing.items || []);
        setRelativePath(listing.path || '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [shareId]);

  useEffect(() => {
    setPathHistory(['']);
    setHistoryIndex(0);
    setRelativePath('');
    setSearchQuery('');
    load('');
  }, [shareId]);

  const navigateToPath = useCallback((newPath, pushToHistory = true) => {
    if (pushToHistory) {
      const nextHistory = pathHistory.slice(0, historyIndex + 1);
      nextHistory.push(newPath);
      setPathHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    }
    setRelativePath(newPath);
    load(newPath);
  }, [pathHistory, historyIndex, load]);

  const goBack = () => {
    if (canGoBack) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const path = pathHistory[newIndex];
      setRelativePath(path);
      load(path);
    }
  };

  const goForward = () => {
    if (canGoForward) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const path = pathHistory[newIndex];
      setRelativePath(path);
      load(path);
    }
  };

  const goUp = () => {
    if (canGoUp) {
      const parts = relativePath.split(/[\\/]/).filter(Boolean);
      parts.pop();
      const parent = parts.join('/');
      navigateToPath(parent);
    }
  };

  const handleRefresh = () => {
    load(relativePath);
  };

  const breadcrumbs = useMemo(() => {
    const parts = relativePath ? relativePath.split(/[\\/]/).filter(Boolean) : [];
    return [{ label: share?.item?.name || 'Shared', path: '' }, ...parts.map((part, index) => ({
      label: part,
      path: parts.slice(0, index + 1).join('/'),
    }))];
  }, [relativePath, share]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const uploadFiles = async (files) => {
    if (!files?.length || !canWrite) return;
    setBusy(true);
    try {
      await shareApi.upload(shareId, relativePath, files);
      await load(relativePath);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const createFolder = async () => {
    const name = window.prompt('Folder name');
    if (!name) return;
    setBusy(true);
    try {
      await shareApi.mkdir(shareId, relativePath, name);
      await load(relativePath);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const renameItem = async (item) => {
    const newName = window.prompt('New name', item.name);
    if (!newName || newName === item.name) return;
    setBusy(true);
    try {
      await shareApi.rename(shareId, item.relativePath, newName);
      await load(relativePath);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setBusy(true);
    try {
      const result = await shareApi.delete(shareId, [item.relativePath]);
      if (!result.success) throw new Error(result.results?.find(r => !r.success)?.error || 'Delete failed');
      await load(relativePath);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openItem = (item) => {
    if (item.isDirectory) navigateToPath(item.relativePath);
    else window.open(shareApi.rawUrl(shareId, item.relativePath), '_blank');
  };

  const onDrop = (e) => {
    e.preventDefault();
    uploadFiles([...e.dataTransfer.files]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0b0b0c] text-on-surface dark:text-zinc-100 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[36px]" style={{ color: accentColor }}>progress_activity</span>
      </div>
    );
  }

  if (error && !share) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0b0b0c] text-on-surface dark:text-zinc-100 flex items-center justify-center p-6">
        <div className="text-center">
          <span className="material-symbols-outlined text-[64px] text-error mb-4">link_off</span>
          <h1 className="text-2xl font-bold">Share Unavailable</h1>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!share?.isDirectory) {
    const item = share.item;
    return (
      <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0b0b0c] text-on-surface dark:text-zinc-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-[#161618] border border-black/10 dark:border-white/10 shadow-xl p-8 text-center">
          <div className="flex justify-center">
            <FileIcon item={item} size="xl" />
          </div>
          <h1 className="mt-5 text-xl font-bold truncate">{item.name}</h1>
          <p className="mt-2 text-sm text-on-surface-variant dark:text-zinc-400">
            {item.extension || 'File'} - {formatBytes(item.size)} - {formatDate(item.modified)}
          </p>
          <a
            href={shareApi.rawUrl(shareId)}
            className="mt-7 inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-bold shadow-lg active:scale-95 transition-all hover:brightness-110"
            style={{ backgroundColor: accentColor || '#013399' }}
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f5f6fa] dark:bg-[#0b0b0c] text-on-surface dark:text-zinc-100 p-4 sm:p-8"
      onDragOver={(e) => canWrite && e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="max-w-6xl mx-auto">
        
        {/* Premium Top Navigation Bar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-[2rem] bg-white/80 dark:bg-[#161618]/80 border border-black/10 dark:border-white/10 shadow-sm backdrop-blur-md">
            
            {/* Navigation Buttons + Breadcrumbs */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Back / Forward / Up Pill */}
              <div className="flex items-center gap-0.5 shrink-0 bg-black/[0.03] dark:bg-white/[0.04] p-1 rounded-full">
                <button
                  onClick={goBack}
                  disabled={!canGoBack}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30 text-on-surface-variant dark:text-zinc-400"
                  title="Go back"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                </button>
                <button
                  onClick={goForward}
                  disabled={!canGoForward}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30 text-on-surface-variant dark:text-zinc-400"
                  title="Go forward"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <button
                  onClick={goUp}
                  disabled={!canGoUp}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30 text-on-surface-variant dark:text-zinc-400"
                  title="Go up one folder"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
                <button
                  onClick={handleRefresh}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-on-surface-variant dark:text-zinc-400"
                  title="Refresh folder content"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>

              <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1 shrink-0"></div>

              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-[13px] font-medium text-on-surface-variant dark:text-zinc-400 truncate">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.path || 'root'} className="flex items-center min-w-0">
                    {index > 0 && (
                      <span className="material-symbols-outlined text-[14px] mx-1 text-black/30 dark:text-white/30 select-none">
                        chevron_right
                      </span>
                    )}
                    <button
                      onClick={() => navigateToPath(crumb.path)}
                      className={`hover:underline truncate ${
                        index === breadcrumbs.length - 1
                          ? 'font-semibold dark:text-zinc-100'
                          : 'text-on-surface-variant dark:text-zinc-400'
                      }`}
                      style={index === breadcrumbs.length - 1 ? { color: accentColor } : undefined}
                    >
                      {crumb.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Scoped Search Input */}
            <div className="relative group w-full md:w-[260px] shrink-0">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-zinc-400 dark:text-zinc-500">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search this folder..."
                className="w-full h-10 pl-10 pr-9 bg-black/[0.03] dark:bg-white/[0.04] rounded-full font-body-md text-[13px] text-on-surface dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-transparent focus:bg-white dark:focus:bg-[#1c1c1f] focus:outline-none focus:ring-2 transition-all shadow-sm"
                style={{ '--tw-ring-color': `${accentColor}33` }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Folder Actions Panel */}
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={shareApi.zipUrl(shareId, relativePath)}
                className="h-10 px-4 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center gap-2 text-xs font-bold tracking-wider uppercase transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download Zip
              </a>
              {canWrite && (
                <>
                  <button
                    onClick={createFolder}
                    disabled={busy}
                    className="h-10 w-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center transition-colors"
                    title="New folder"
                  >
                    <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="h-10 w-10 rounded-full text-white flex items-center justify-center shadow-md hover:brightness-110 transition-all active:scale-95"
                    style={{ backgroundColor: accentColor || '#013399' }}
                    title="Upload files"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => uploadFiles([...e.target.files])}
                  />
                </>
              )}
            </div>

          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-error/10 text-error px-4 py-3 text-sm font-medium">{error}</div>
        )}

        {/* Directory Listings Grid / Table */}
        <main className="rounded-[28px] bg-white dark:bg-[#161618] border border-black/10 dark:border-white/10 shadow-sm overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="py-24 text-center text-on-surface-variant dark:text-zinc-400">
              <span className="material-symbols-outlined text-[64px] opacity-30 mb-3">
                {searchQuery ? 'search_off' : 'folder_open'}
              </span>
              <p className="font-semibold">{searchQuery ? 'No matching files or folders' : 'This folder is empty'}</p>
              {searchQuery && (
                <p className="text-xs text-on-surface-variant/70 mt-1">Try refining your search query</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {filteredItems.map((item) => (
                <div key={item.relativePath} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_150px_150px_auto] gap-3 items-center px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                  <button onClick={() => openItem(item)} className="min-w-0 flex items-center gap-3 text-left">
                    <FileIcon item={item} size="md" animate={false} />
                    <span className="truncate text-sm font-medium">{item.name}</span>
                  </button>
                  <div className="hidden sm:block text-sm text-on-surface-variant dark:text-zinc-400">{formatDate(item.modified)}</div>
                  <div className="hidden sm:block text-sm text-on-surface-variant dark:text-zinc-400 text-right">{item.isDirectory ? '--' : formatBytes(item.size)}</div>
                  <div className="flex justify-end gap-1">
                    <a href={item.isDirectory ? shareApi.zipUrl(shareId, item.relativePath) : shareApi.rawUrl(shareId, item.relativePath)} className="w-9 h-9 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center" title="Download">
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </a>
                    {canWrite && (
                      <>
                        <button onClick={() => renameItem(item)} className="w-9 h-9 rounded-lg hover:bg-black/10 dark:hover:bg-white/10" title="Rename">
                          <span className="material-symbols-outlined text-[18px]">drive_file_rename_outline</span>
                        </button>
                        <button onClick={() => deleteItem(item)} className="w-9 h-9 rounded-lg hover:bg-error/10 text-error" title="Delete">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
