import { useState, useEffect, useRef } from 'react';
import useUIStore from '../../stores/useUIStore';
import AnimatedFolderIcon from '../files/AnimatedFolderIcon';

export default function Modal() {
  const { modal, hideModal, accentColor } = useUIStore();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (modal.visible) {
      if (modal.type === 'rename') {
        const name = modal.data?.name || '';
        const dotIdx = name.lastIndexOf('.');
        setInputValue(name);
        // Select filename without extension
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(0, dotIdx > 0 ? dotIdx : name.length);
          }
        }, 50);
      } else if (modal.type === 'newFolder') {
        setInputValue('New Folder');
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, 50);
      }
    }
  }, [modal.visible, modal.type, modal.data]);

  if (!modal.visible || ['properties', 'settings', 'share'].includes(modal.type)) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modal.data?.onConfirm) {
      modal.data.onConfirm(inputValue);
    }
    hideModal();
  };

  const handleCancel = () => {
    if (modal.data?.onCancel) modal.data.onCancel();
    hideModal();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center animate-fade-in" onClick={handleCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/15 dark:bg-black/40 backdrop-blur-[6px]" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-md p-7 rounded-[28px] text-black dark:text-zinc-100 glass-menu animate-menu-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* macOS style Close traffic light top-left */}
        <div className="absolute top-5 left-5 flex gap-1.5 group/lights">
          <button 
            onClick={handleCancel}
            className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] flex items-center justify-center text-[8px] font-bold text-red-900/0 group-hover/lights:text-red-900/80 transition-all shadow-sm cursor-pointer"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Title & Icon Header */}
        <div className="flex flex-col items-center mb-6 pt-2">
          {(modal.type === 'newFolder' || modal.type === 'rename') && (
            <div className="mb-4 transform transition-all duration-500 scale-110">
              <AnimatedFolderIcon className="w-20 h-20" animate={true} />
            </div>
          )}
          <h3 className="text-[17px] font-bold text-on-surface dark:text-zinc-200">
            {modal.type === 'rename' && 'Rename Item'}
            {modal.type === 'newFolder' && 'New Folder'}
            {modal.type === 'delete' && 'Move to Recycle Bin?'}
            {modal.type === 'confirm' && (modal.data?.title || 'Confirm')}
          </h3>
          {modal.type === 'newFolder' && (
            <p className="text-[12px] text-on-surface-variant/60 dark:text-zinc-400/60 mt-1">Enter a name for this new folder.</p>
          )}
        </div>

        {/* Content */}
        {(modal.type === 'rename' || modal.type === 'newFolder') && (
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative group mb-6">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 
                           text-on-surface dark:text-zinc-200 text-[14px] font-medium text-center
                           focus:outline-none focus:ring-4
                           transition-all group-hover:bg-black/10 dark:group-hover:bg-white/10"
                placeholder={modal.type === 'newFolder' ? 'Folder name' : 'Enter new name'}
                style={{ '--tw-ring-color': `${accentColor}33`, borderColor: `${accentColor}4D` }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="w-full py-4 rounded-2xl text-white text-[15px] font-bold shadow-xl transition-all hover:brightness-110 active:scale-95 ios-gradient disabled:opacity-50 disabled:grayscale"
                style={{ backgroundColor: accentColor }}
              >
                {modal.type === 'rename' ? 'Rename' : 'Create Folder'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-3 rounded-2xl text-[13px] font-bold text-on-surface-variant/40 dark:text-zinc-500 hover:text-on-surface-variant/80 dark:hover:text-zinc-350 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {modal.type === 'delete' && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 w-20 h-20 bg-error/10 rounded-3xl flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[48px] filled">delete</span>
            </div>
            <p className="text-[14px] text-on-surface-variant dark:text-zinc-400 leading-relaxed px-4">
              Are you sure you want to delete <strong className="text-on-surface dark:text-zinc-200 font-bold">{modal.data?.count || 1} items</strong>?
              They will move to Recycle Bin so they can be restored later.
            </p>
            <div className="flex flex-col gap-2 w-full mt-8">
              <button
                onClick={handleSubmit}
                className="w-full py-4 rounded-2xl bg-error text-white text-[15px] font-bold shadow-xl transition-all hover:brightness-110 active:scale-95"
              >
                Move to Recycle Bin
              </button>
              <button
                onClick={handleCancel}
                className="w-full py-3 rounded-2xl text-[13px] font-bold text-on-surface-variant/40 dark:text-zinc-500 hover:text-on-surface-variant/80 dark:hover:text-zinc-350 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
