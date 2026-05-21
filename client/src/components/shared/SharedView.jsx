import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { shareApi } from '../../api/shareApi';
import FileIcon from '../files/FileIcon';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';

export default function SharedView({ shareId }) {
  const [share, setShare] = useState(null);
  const [items, setItems] = useState([]);
  const [relativePath, setRelativePath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const canWrite = share?.permission === 'write' && share?.isDirectory;

  const load = useCallback(async (path = relativePath) => {
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
  }, [shareId, relativePath]);

  useEffect(() => {
    load('');
  }, [shareId]);

  const breadcrumbs = useMemo(() => {
    const parts = relativePath ? relativePath.split(/[\\/]/).filter(Boolean) : [];
    return [{ label: share?.item?.name || 'Shared', path: '' }, ...parts.map((part, index) => ({
      label: part,
      path: parts.slice(0, index + 1).join('/'),
    }))];
  }, [relativePath, share]);

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
    if (item.isDirectory) load(item.relativePath);
    else window.open(shareApi.rawUrl(shareId, item.relativePath), '_blank');
  };

  const onDrop = (e) => {
    e.preventDefault();
    uploadFiles([...e.dataTransfer.files]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0b0b0c] text-on-surface dark:text-zinc-100 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[36px]">progress_activity</span>
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
          <FileIcon item={item} size="xl" />
          <h1 className="mt-5 text-xl font-bold truncate">{item.name}</h1>
          <p className="mt-2 text-sm text-on-surface-variant dark:text-zinc-400">
            {item.extension || 'File'} - {formatBytes(item.size)} - {formatDate(item.modified)}
          </p>
          <a
            href={shareApi.rawUrl(shareId)}
            className="mt-7 inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-bold shadow-lg active:scale-95 transition-all"
            style={{ backgroundColor: '#013399' }}
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
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-on-surface-variant dark:text-zinc-400 flex-wrap">
              {breadcrumbs.map((crumb, index) => (
                <button
                  key={crumb.path || 'root'}
                  onClick={() => load(crumb.path)}
                  className="hover:underline font-medium"
                >
                  {index > 0 && <span className="mx-1 opacity-50">/</span>}
                  {crumb.label}
                </button>
              ))}
            </div>
            <h1 className="text-[30px] font-bold tracking-tight truncate mt-1">{share.item.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={shareApi.zipUrl(shareId, relativePath)}
              className="h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center gap-2 text-sm font-bold"
            >
              <span className="material-symbols-outlined text-[19px]">download</span>
              Download
            </a>
            {canWrite && (
              <>
                <button onClick={createFolder} disabled={busy} className="h-11 w-11 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15" title="New folder">
                  <span className="material-symbols-outlined text-[20px]">create_new_folder</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={busy} className="h-11 w-11 rounded-xl text-white" style={{ backgroundColor: '#013399' }} title="Upload">
                  <span className="material-symbols-outlined text-[20px]">upload</span>
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => uploadFiles([...e.target.files])} />
              </>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl bg-error/10 text-error px-4 py-3 text-sm font-medium">{error}</div>
        )}

        <main className="rounded-[28px] bg-white dark:bg-[#161618] border border-black/10 dark:border-white/10 shadow-sm overflow-hidden">
          {items.length === 0 ? (
            <div className="py-24 text-center text-on-surface-variant dark:text-zinc-400">
              <span className="material-symbols-outlined text-[64px] opacity-30 mb-3">folder_open</span>
              <p className="font-semibold">This folder is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {items.map((item) => (
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
