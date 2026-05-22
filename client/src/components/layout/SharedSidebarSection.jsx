import { useEffect, useMemo, useState, useCallback } from 'react';
import sharedApi from '../../api/sharedApi';
import useUIStore from '../../stores/useUIStore';
import useFileStore from '../../stores/useFileStore';

/* ── helpers ─────────────────────────────────────────────────────── */
function timeAgo(iso) {
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

function PermBadge({ perm }) {
  const isWrite = perm === 'write';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[1px] rounded-full text-[10px] font-bold tracking-wide uppercase
        ${isWrite
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
        }`}
    >
      <span className="material-symbols-outlined text-[11px]">
        {isWrite ? 'edit' : 'visibility'}
      </span>
      {isWrite ? 'Read & Write' : 'Read Only'}
    </span>
  );
}

/* ── main component ──────────────────────────────────────────────── */
export default function SharedSidebarSection() {
  const { accentColor, setCurrentView, setActiveNav, currentView } = useUIStore();

  const handleHeaderClick = (e) => {
    e.preventDefault();
    setCurrentView('shared');
    setActiveNav('shared');
  };

  const handleItemClick = (s) => {
    if (!s.exists) return;
    setCurrentView('files');
    if (s.isDirectory) {
      useFileStore.getState().navigateTo(s.path);
    } else {
      const parts = s.path.split('\\');
      parts.pop();
      const parent = parts.join('\\');
      useFileStore.getState().navigateTo(parent);
    }
  };
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  /* fetch */
  const fetchShares = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sharedApi.listAll();
      if (res?.success) setShares(res.shares || []);
      else setShares([]);
    } catch {
      setShares([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShares(); }, [fetchShares]);

  /* sorted, newest first */
  const sorted = useMemo(
    () => [...shares].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [shares],
  );

  /* selection helpers */
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(sorted.map(s => s.id)));
  const deselectAll = () => setSelected(new Set());

  /* remove selected */
  const removeSelected = async () => {
    const ids = [...selected];
    for (const id of ids) {
      try { await sharedApi.delete(id); } catch { /* skip */ }
    }
    setShares(prev => prev.filter(s => !selected.has(s.id)));
    setSelected(new Set());
    setSelectMode(false);
  };

  /* clear all */
  const clearAll = async () => {
    try {
      await sharedApi.clearAll();
      setShares([]);
      setSelected(new Set());
      setSelectMode(false);
      setConfirmClear(false);
    } catch { /* ignore */ }
  };

  /* copy link */
  const copyLink = (id) => {
    const link = `${window.location.origin}/?share=${id}`;
    navigator.clipboard.writeText(link);
  };

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <div className="mt-6 px-2">
      {/* Header row */}
      <div className="w-full flex items-center justify-between px-6 mb-1 group">
        <button
          onClick={handleHeaderClick}
          className="text-outline-variant font-label-sm text-[11px] uppercase tracking-wider font-semibold select-none hover:text-primary transition-colors flex items-center gap-1.5"
          style={currentView === 'shared' ? { color: accentColor } : {}}
        >
          Shared
          {sorted.length > 0 && (
            <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center bg-black/5 dark:bg-white/10 text-on-surface-variant dark:text-zinc-400">
              {sorted.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setExpanded(e => !e)}
          className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center"
        >
          <span className={`material-symbols-outlined text-[16px] text-on-surface-variant dark:text-zinc-500 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}>
            expand_more
          </span>
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-0.5">
          {/* Toolbar – visible when there are shares */}
          {sorted.length > 0 && (
            <div className="flex items-center gap-1 px-3 mb-1">
              <button
                onClick={() => { setSelectMode(m => !m); if (selectMode) deselectAll(); }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all
                  ${selectMode
                    ? 'bg-black/8 dark:bg-white/10 text-on-surface dark:text-zinc-200'
                    : 'text-on-surface-variant dark:text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                title="Select mode"
              >
                <span className="material-symbols-outlined text-[14px]">checklist</span>
                Select
              </button>

              {selectMode && selected.size > 0 && (
                <button
                  onClick={removeSelected}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  title="Remove selected"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Remove ({selected.size})
                </button>
              )}

              {selectMode && (
                <button
                  onClick={() => selected.size === sorted.length ? deselectAll() : selectAll()}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium text-on-surface-variant dark:text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  {selected.size === sorted.length ? 'Deselect All' : 'Select All'}
                </button>
              )}

              <div className="flex-1" />

              {/* Clear All */}
              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-on-surface-variant dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  title="Clear all shares"
                >
                  <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={clearAll}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 transition-all"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 rounded-lg text-[11px] font-medium text-on-surface-variant dark:text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-2 px-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[52px] rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && sorted.length === 0 && (
            <div className="flex flex-col items-center py-6 px-4">
              <span className="material-symbols-outlined text-[32px] text-on-surface-variant/40 dark:text-zinc-600 mb-2">
                share_off
              </span>
              <span className="text-[12px] text-on-surface-variant dark:text-zinc-500 text-center">
                No shared items yet
              </span>
            </div>
          )}

          {/* Share list */}
          {!loading && sorted.map((s) => {
            const isSelected = selected.has(s.id);
            return (
              <div
                key={s.id}
                className={`group relative flex items-start gap-2.5 px-3 py-2.5 rounded-2xl transition-all duration-150 cursor-default
                  ${isSelected
                    ? 'bg-black/[0.06] dark:bg-white/[0.08]'
                    : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }
                  ${!s.exists ? 'opacity-50' : ''}
                `}
              >
                {/* Checkbox in select mode */}
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(s.id)}
                    className="mt-0.5 shrink-0 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all"
                    style={isSelected ? { backgroundColor: accentColor, borderColor: accentColor } : { borderColor: '#c4c4c4' }}
                  >
                    {isSelected && (
                      <span className="material-symbols-outlined text-white text-[13px]">check</span>
                    )}
                  </button>
                )}

                {/* Icon */}
                <div
                  className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${accentColor}18` }}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ color: accentColor }}
                  >
                    {s.isDirectory ? 'folder_shared' : 'share'}
                  </span>
                </div>

                {/* Info */}
                <div
                  onClick={() => handleItemClick(s)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-[13px] font-semibold text-on-surface dark:text-zinc-200 leading-tight hover:underline">
                      {s.displayName || s.name || (s.path ? s.path.split('\\').pop() : 'Shared')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <PermBadge perm={s.permission} />
                    <span className="text-[10px] text-on-surface-variant/70 dark:text-zinc-500 font-medium">
                      {timeAgo(s.createdAt)}
                    </span>
                  </div>

                  {/* Path hint */}
                  <div className="mt-0.5 text-[10px] text-on-surface-variant/50 dark:text-zinc-600 truncate" title={s.path}>
                    {s.path}
                  </div>

                  {/* Guest activity indicator */}
                  {s.lastActivity ? (
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      <span className="material-symbols-outlined text-[12px]">pending_actions</span>
                      <span className="truncate" title={s.lastActivity.action}>
                        {s.lastActivity.action} ({timeAgo(s.lastActivity.timestamp)})
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Quick actions on hover */}
                {!selectMode && (
                  <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-1">
                    <button
                      onClick={() => copyLink(s.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                      title="Copy share link"
                    >
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant dark:text-zinc-400">link</span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await sharedApi.delete(s.id);
                          setShares(prev => prev.filter(x => x.id !== s.id));
                        } catch { /* ignore */ }
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      title="Remove share"
                    >
                      <span className="material-symbols-outlined text-[16px] text-red-500 dark:text-red-400">close</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
