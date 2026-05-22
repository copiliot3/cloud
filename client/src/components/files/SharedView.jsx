import { useEffect, useState, useMemo } from 'react';
import useUIStore from '../../stores/useUIStore';
import sharedApi from '../../api/sharedApi';
import FileIcon from './FileIcon';
import { formatDate } from '../../utils/formatDate';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SharedView() {
  const { accentColor, addToast } = useUIStore();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const res = await sharedApi.listAll();
      if (res?.success) {
        setShares(res.shares || []);
      } else {
        setShares([]);
      }
    } catch (e) {
      addToast(e.message || 'Failed to fetch shared items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, []);

  const sortedShares = useMemo(() => {
    return [...shares].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [shares]);

  const handleTogglePermission = async (shareId, currentPerm) => {
    const nextPerm = currentPerm === 'write' ? 'read' : 'write';
    try {
      const res = await sharedApi.updatePermission(shareId, nextPerm);
      if (res?.success) {
        setShares(prev => prev.map(s => s.id === shareId ? { ...s, permission: nextPerm } : s));
        addToast(`Permission updated to ${nextPerm === 'write' ? 'Read & Write' : 'Read Only'}`);
      } else {
        addToast('Failed to update permission', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error updating permission', 'error');
    }
  };

  const handleCopyLink = (shareId) => {
    const link = `${window.location.origin}/?share=${shareId}`;
    navigator.clipboard.writeText(link);
    addToast('Share link copied to clipboard!', 'success');
  };

  const handleRemoveShare = async (shareId) => {
    try {
      const res = await sharedApi.delete(shareId);
      if (res?.success) {
        setShares(prev => prev.filter(s => s.id !== shareId));
        addToast('Stopped sharing successfully');
      } else {
        addToast('Failed to delete share', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error removing share', 'error');
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRemoveSelected = async () => {
    const ids = [...selected];
    let successCount = 0;
    for (const id of ids) {
      try {
        const res = await sharedApi.delete(id);
        if (res?.success) successCount++;
      } catch (err) {
        // ignore individual errors
      }
    }
    setShares(prev => prev.filter(s => !selected.has(s.id)));
    setSelected(new Set());
    setSelectMode(false);
    addToast(`Stopped sharing ${successCount} item(s)`);
  };

  const handleClearAll = async () => {
    try {
      const res = await sharedApi.clearAll();
      if (res?.success) {
        setShares([]);
        setSelected(new Set());
        setSelectMode(false);
        setConfirmClear(false);
        addToast('Cleared all shared items successfully');
      } else {
        addToast('Failed to clear shares', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error clearing shares', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 py-6">
        <div className="mb-6 shrink-0 flex items-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-primary animate-pulse">group</span>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight" style={{ color: accentColor }}>Shared Link Manager</h2>
            <div className="skeleton h-3.5 w-64 mt-1.5" />
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-3 mt-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 w-full rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 py-6">
      {/* Header section */}
      <div className="mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[32px]" style={{ color: accentColor }}>group</span>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight" style={{ color: accentColor }}>Shared Link Manager</h2>
            <p className="font-label-md text-on-surface-variant dark:text-zinc-400 mt-1">
              Manage link privileges, monitor modifications by guests, and revoke shared access.
            </p>
          </div>
        </div>

        {/* Toolbar controls */}
        {sortedShares.length > 0 && (
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelected(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-200 border
                ${selectMode
                  ? 'bg-black/10 dark:bg-white/10 text-on-surface border-transparent'
                  : 'text-on-surface-variant dark:text-zinc-400 border-surface-variant dark:border-zinc-800 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
              <span className="material-symbols-outlined text-[16px]">checklist</span>
              {selectMode ? 'Cancel' : 'Select'}
            </button>

            {selectMode && selected.size > 0 && (
              <button
                onClick={handleRemoveSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 hover:bg-red-100 transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Stop Sharing ({selected.size})
              </button>
            )}

            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase border border-red-200 text-red-600 dark:border-red-900/30 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                Revoke All
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/20 p-1 rounded-full border border-red-200 dark:border-red-900/30">
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1 rounded-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all duration-200"
                >
                  Clear All Shares
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1 rounded-full text-xs font-semibold text-on-surface-variant dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Table */}
      <div className="flex-1 overflow-y-auto pr-1 pb-6 hide-scrollbar flex flex-col">
        {sortedShares.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <span className="material-symbols-outlined text-[72px] text-primary select-none relative z-10" style={{ color: accentColor }}>
                group
              </span>
            </div>
            <p className="text-xl font-bold text-on-surface dark:text-zinc-100">No Shared Folders or Files</p>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 max-w-sm mt-2">
              Share folders or files with anyone, and configure read/write permissions here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col min-w-[800px]">
            {/* Table Head */}
            <div className="grid grid-cols-[50px_1.5fr_1.8fr_140px_180px_130px_100px] gap-4 px-4 py-2 border-b border-surface-variant dark:border-zinc-800/80 font-label-sm text-[12px] text-outline dark:text-zinc-500 uppercase tracking-wider sticky top-0 bg-white/90 dark:bg-[#161618]/90 backdrop-blur-md z-20">
              <div className="flex justify-center items-center">
                {selectMode && (
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selected.size === sortedShares.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set(sortedShares.map(s => s.id)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                  />
                )}
              </div>
              <div className="font-semibold text-on-surface dark:text-zinc-300">Name / Item</div>
              <div className="font-semibold text-on-surface dark:text-zinc-300">Local Path</div>
              <div className="font-semibold text-on-surface dark:text-zinc-300 text-center">Permissions</div>
              <div className="font-semibold text-on-surface dark:text-zinc-300">Recent Guest Activity</div>
              <div className="font-semibold text-on-surface dark:text-zinc-300">Date Shared</div>
              <div className="font-semibold text-on-surface dark:text-zinc-300 text-center">Actions</div>
            </div>

            {/* List Items */}
            <div className="flex flex-col mt-1 gap-1">
              {sortedShares.map((s, index) => {
                const isSelected = selected.has(s.id);
                const hasActivity = !!s.lastActivity;
                const fakeItem = {
                  name: s.displayName || s.name || s.path.split('\\').pop(),
                  isDirectory: s.isDirectory,
                  path: s.path
                };

                return (
                  <div
                    key={s.id}
                    className={`
                      group grid grid-cols-[50px_1.5fr_1.8fr_140px_180px_130px_100px] gap-4 px-4 py-3 items-center transition-all duration-200 rounded-2xl border
                      ${isSelected
                        ? 'bg-black/[0.04] dark:bg-white/[0.06] border-surface-variant dark:border-zinc-800'
                        : 'border-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                      }
                      ${!s.exists ? 'opacity-60' : ''}
                    `}
                  >
                    {/* Checkbox Column */}
                    <div className="flex justify-center items-center">
                      {selectMode ? (
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={isSelected}
                          onChange={() => toggleSelect(s.id)}
                        />
                      ) : (
                        <span className="material-symbols-outlined text-[20px] text-zinc-400 dark:text-zinc-600 select-none">
                          {s.isDirectory ? 'folder_shared' : 'share'}
                        </span>
                      )}
                    </div>

                    {/* Name + Icon */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0">
                        <FileIcon item={fakeItem} size="md" animate={false} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-[14px] text-on-surface dark:text-zinc-200 truncate" title={fakeItem.name}>
                          {fakeItem.name}
                        </span>
                        {!s.exists && (
                          <span className="text-[10px] text-red-500 font-medium">Deleted on disk</span>
                        )}
                      </div>
                    </div>

                    {/* Path */}
                    <div className="text-[13px] text-on-surface-variant dark:text-zinc-400 truncate" title={s.path}>
                      {s.path}
                    </div>

                    {/* Permissions Toggle Dropdown */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleTogglePermission(s.id, s.permission)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-150
                          ${s.permission === 'write'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60'
                            : 'bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/60'
                          }`}
                        title="Click to toggle read/write permission"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {s.permission === 'write' ? 'edit' : 'visibility'}
                        </span>
                        {s.permission === 'write' ? 'Read & Write' : 'Read Only'}
                      </button>
                    </div>

                    {/* Recent Guest Activity */}
                    <div className="flex items-center gap-2 min-w-0">
                      {hasActivity ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] text-amber-500 shrink-0 select-none" title="Modification detected!">
                            pending_actions
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-semibold text-on-surface dark:text-zinc-300 truncate" title={s.lastActivity.action}>
                              {s.lastActivity.action}
                            </span>
                            <span className="text-[10px] text-on-surface-variant dark:text-zinc-500">
                              {timeAgo(s.lastActivity.timestamp)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-[12px] text-on-surface-variant/60 dark:text-zinc-500 italic">
                          No activity detected
                        </span>
                      )}
                    </div>

                    {/* Date Shared */}
                    <div className="text-[13px] text-on-surface-variant dark:text-zinc-400">
                      {formatDate(s.createdAt)}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleCopyLink(s.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10 hover:text-on-surface transition-all active:scale-95"
                        title="Copy shareable link"
                      >
                        <span className="material-symbols-outlined text-[18px]">link</span>
                      </button>
                      <button
                        onClick={() => handleRemoveShare(s.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-95"
                        title="Stop sharing (revoke access)"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
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
