import { useRef, useEffect } from 'react';
import SearchBar from '../shared/SearchBar';
import ViewToggle from '../shared/ViewToggle';
import useUIStore from '../../stores/useUIStore';
import useFileStore from '../../stores/useFileStore';
import useSearchStore from '../../stores/useSearchStore';
import { fileApi } from '../../api/fileApi';

export default function Topbar() {
  const { toggleSidebar, currentView, showModal, addToast, accentColor } = useUIStore();
  const { selectedItems, currentPath, copyToClipboard, cutToClipboard, paste, refresh, deleteFiles } = useFileStore();
  const { query, setQuery, clearSearch, isSearching, isActive } = useSearchStore();
  const hasSelection = selectedItems.size > 0;
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isCtrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      if (isCtrlK) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleNewFolder = () => {
    if (!currentPath) return;
    showModal('newFolder', {
      onConfirm: async (name) => {
        try {
          const folderPath = `${currentPath}\\${name}`;
          await fileApi.mkdir(folderPath);
          addToast(`Folder "${name}" created`);
          refresh();
        } catch (err) {
          addToast(err.message, 'error');
        }
      },
    });
  };

  const handleDelete = () => {
    const paths = [...selectedItems];
    showModal('delete', {
      count: paths.length,
      onConfirm: () => deleteFiles(paths),
    });
  };

  const handleRename = () => {
    if (selectedItems.size !== 1) return;
    const path = [...selectedItems][0];
    const name = path.split('\\').pop();
    showModal('rename', {
      name,
      onConfirm: async (newName) => {
        try {
          await fileApi.rename(path, newName);
          addToast(`Renamed to "${newName}"`);
          refresh();
        } catch (err) {
          addToast(err.message, 'error');
        }
      },
    });
  };

  const handlePaste = async () => {
    const result = await paste();
    if (result?.success) addToast('Items pasted successfully');
    else if (result?.error) addToast(result.error, 'error');
  };

  const handleUpload = () => {
    showModal('upload');
  };

  return (
    <header className="w-full h-16 flex items-center justify-between px-2 shrink-0 bg-transparent mb-2">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="lg:hidden p-1 text-on-surface-variant dark:text-zinc-400">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="hidden lg:block relative w-[500px]">
          {/* Inline Search Input */}
          <div className="relative group w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-outline dark:text-zinc-500" style={{ color: isActive ? accentColor : undefined }}>
              search
            </span>
            <input 
              ref={searchInputRef}
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files and folders..." 
              className="w-full h-11 pl-12 pr-24 bg-white dark:bg-[#1c1c1f] rounded-full font-body-md text-[14px] text-on-surface dark:text-zinc-100 placeholder:text-outline dark:placeholder:text-zinc-500 border border-surface-variant/40 dark:border-zinc-800/80 focus:outline-none focus:ring-2 transition-all shadow-sm"
              style={{ '--tw-ring-color': `${accentColor}4D` }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {isActive && (
                <button
                  onClick={clearSearch}
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.08] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
              )}
              {!isActive && (
                <div className="flex items-center gap-1 opacity-60">
                  <kbd className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded text-[10px] font-semibold bg-black/[0.04] dark:bg-white/[0.08] text-zinc-500 dark:text-zinc-400 border border-black/[0.06] dark:border-white/[0.1]">Ctrl</kbd>
                  <kbd className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded text-[10px] font-semibold bg-black/[0.04] dark:bg-white/[0.08] text-zinc-500 dark:text-zinc-400 border border-black/[0.06] dark:border-white/[0.1]">K</kbd>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {currentView === 'files' && (
          <>
            <button onClick={handleNewFolder} className="h-10 px-4 bg-white dark:bg-[#1c1c1f] border border-surface-variant dark:border-zinc-800 rounded-full shadow-sm flex items-center gap-2 text-on-surface dark:text-zinc-200 font-label-md text-[14px] hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors">
              <span className="material-symbols-outlined text-[18px]">create_new_folder</span>New Folder
            </button>
            <button onClick={handleUpload} className="h-10 px-4 bg-white dark:bg-[#1c1c1f] border border-surface-variant dark:border-zinc-800 rounded-full shadow-sm flex items-center gap-2 text-on-surface dark:text-zinc-200 font-label-md text-[14px] hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors">
              <span className="material-symbols-outlined text-[18px]">upload</span>Upload
            </button>

            <div className="h-6 w-px bg-surface-variant dark:bg-zinc-800 mx-1"></div>

            <div className="flex items-center gap-1 text-on-surface-variant dark:text-zinc-400">
              <button onClick={() => { cutToClipboard(); addToast('Items cut', 'info'); }} disabled={!hasSelection} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-white/5 transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined text-[20px]">content_cut</span>
              </button>
              <button onClick={() => { copyToClipboard(); addToast('Items copied', 'info'); }} disabled={!hasSelection} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-white/5 transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined text-[20px]">content_copy</span>
              </button>
              <button onClick={handlePaste} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">content_paste</span>
              </button>
              <button onClick={handleRename} disabled={selectedItems.size !== 1} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-white/5 transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined text-[20px]">edit_square</span>
              </button>
              <button onClick={handleDelete} disabled={!hasSelection} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>

            <div className="h-6 w-px bg-surface-variant dark:bg-zinc-800 mx-1"></div>
            <ViewToggle />
          </>
        )}

        <div className="flex items-center gap-2 ml-2">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant dark:text-zinc-400 hover:bg-white dark:hover:bg-white/5 transition-all relative">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-[10px] right-[10px] w-2 h-2 bg-red-500 rounded-full border-2 border-[#f8fafd] dark:border-[#161618]"></span>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant dark:text-zinc-400 hover:bg-white dark:hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined text-[22px]">apps</span>
          </button>
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center shadow-sm overflow-hidden cursor-pointer ml-1">
            <img src="https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff" alt="User Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
}
