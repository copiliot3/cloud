import { useEffect, useMemo, useState } from 'react';
import useUIStore from '../../stores/useUIStore';
import { shareApi } from '../../api/shareApi';

export default function ShareModal() {
  const { modal, hideModal, accentColor, addToast } = useUIStore();
  const [permission, setPermission] = useState('read');
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const item = modal.data?.item;
  const visible = modal.visible && modal.type === 'share';

  const title = useMemo(() => item ? `Share "${item.name}"` : 'Share Item', [item]);

  useEffect(() => {
    if (!visible) return;
    setPermission('read');
    setLink('');
    setError(null);
    setCopied(false);
  }, [visible, item?.path]);

  useEffect(() => {
    if (!visible || !item?.path) return;
    let cancelled = false;

    const generate = async () => {
      setLoading(true);
      setCopied(false);
      setError(null);
      try {
        const result = await shareApi.create(item.path, permission);
        if (cancelled) return;
        if (!result.link) {
          throw new Error('No share link returned from server');
        }
        setLink(result.link);
        try {
          await navigator.clipboard.writeText(result.link);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to generate share link');
          addToast(err.message || 'Unable to generate share link', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
  }, [visible, item?.path, permission, addToast]);

  if (!visible) return null;

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      addToast('Share link copied');
    } catch {
      addToast('Could not copy link automatically', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center animate-fade-in" onClick={hideModal}>
      <div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[8px]" />
      <div
        className="relative w-full max-w-lg p-7 rounded-[28px] text-on-surface dark:text-zinc-100 glass-menu animate-menu-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={hideModal}
          className="absolute top-5 left-5 w-3.5 h-3.5 rounded-full bg-[#ff5f56]"
          title="Close"
        />

        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-20 h-20 rounded-[24px] flex items-center justify-center mb-5 shadow-xl" style={{ backgroundColor: `${accentColor}18`, color: accentColor }}>
            <span className="material-symbols-outlined text-[44px]">ios_share</span>
          </div>
          <h3 className="text-[18px] font-bold max-w-[360px] truncate">{title}</h3>
          <p className="text-[12px] text-on-surface-variant dark:text-zinc-400 mt-1">
            Anyone with this link can access the shared {item?.isDirectory ? 'folder' : 'file'}.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/5 dark:bg-white/5">
          <button
            onClick={() => setPermission('read')}
            className={`py-3 rounded-xl text-[13px] font-bold transition-all ${permission === 'read' ? 'text-white shadow-lg' : 'text-on-surface-variant dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-white/5'}`}
            style={permission === 'read' ? { backgroundColor: accentColor } : {}}
          >
            Read-Only
          </button>
          <button
            onClick={() => setPermission('write')}
            className={`py-3 rounded-xl text-[13px] font-bold transition-all ${permission === 'write' ? 'text-white shadow-lg' : 'text-on-surface-variant dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-white/5'}`}
            style={permission === 'write' ? { backgroundColor: accentColor } : {}}
          >
            Read & Write
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-white/70 dark:bg-zinc-950/40 border border-black/10 dark:border-white/10 p-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined text-[22px] ${loading ? 'animate-spin' : ''}`} style={{ color: accentColor }}>
              {loading ? 'progress_activity' : 'link'}
            </span>
            <input
              readOnly
              value={loading ? 'Generating link...' : link}
              className="min-w-0 flex-1 bg-transparent outline-none text-[13px] font-medium text-on-surface dark:text-zinc-200"
            />
            <button
              onClick={copyLink}
              disabled={!link || loading}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all active:scale-95"
              style={{ backgroundColor: accentColor }}
              title="Copy link"
            >
              <span className="material-symbols-outlined text-[19px]">{copied ? 'check' : 'content_copy'}</span>
            </button>
          </div>
          {error && (
            <div className="text-sm text-error font-medium px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/20">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
