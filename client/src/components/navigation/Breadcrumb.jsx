import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';

export default function Breadcrumb() {
  const { currentPath, history, historyIndex, goBack, goForward, goUp, navigateTo, refresh } = useFileStore();
  const { currentView, setCurrentView, accentColor, shareMode } = useUIStore();

  const segments = currentPath ? currentPath.split('\\').filter(Boolean) : [];

  const handleSegmentClick = (index) => {
    if (index === 0) {
      navigateTo(segments[0] + '\\');
    } else {
      const path = segments.slice(0, index + 1).join('\\');
      navigateTo(path);
    }
  };

  const handleHomeClick = () => {
    setCurrentView('drives');
    navigateTo('');
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;
  const canGoUp = segments.length > 1;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1c1c1f] rounded-full border border-surface-variant/40 dark:border-zinc-800/80 shadow-sm mx-2">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-0.5">
        <button onClick={goBack} disabled={!canGoBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors disabled:opacity-30">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant dark:text-zinc-400">arrow_back</span>
        </button>
        <button onClick={goForward} disabled={!canGoForward} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors disabled:opacity-30">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant dark:text-zinc-400">arrow_forward</span>
        </button>
        <button onClick={goUp} disabled={!canGoUp} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors disabled:opacity-30">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant dark:text-zinc-400">arrow_upward</span>
        </button>
      </div>

      <div className="w-px h-4 bg-surface-variant dark:bg-zinc-800 mx-1"></div>

      {!shareMode.active && (
        <>
          <button onClick={handleHomeClick} className="flex items-center gap-1.5 h-8 px-2.5 rounded-full hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors text-on-surface-variant dark:text-zinc-400 font-medium text-[13px]">
            <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
            This PC
          </button>

          <span className="material-symbols-outlined text-outline-variant dark:text-zinc-600 text-[16px]">chevron_right</span>
          
          <button 
            onClick={handleHomeClick} 
            className="font-medium text-[13px] text-on-surface-variant dark:text-zinc-400 transition-colors"
            style={{ color: currentView === 'drives' ? accentColor : undefined }}
            onMouseEnter={(e) => e.target.style.color = accentColor}
            onMouseLeave={(e) => e.target.style.color = currentView === 'drives' ? accentColor : ''}
          >
            Drives
          </button>
        </>
      )}

      {shareMode.active && (
        <>
          <span className="font-medium text-[13px] text-on-surface-variant dark:text-zinc-400">
            Shared Item
          </span>
        </>
      )}

      {currentView !== 'drives' && segments.map((segment, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline-variant dark:text-zinc-600 text-[16px]">chevron_right</span>
          <span
            onClick={() => handleSegmentClick(index)}
            className={`font-medium text-[13px] cursor-pointer transition-colors ${
              index === segments.length - 1
                ? 'font-semibold dark:text-zinc-200'
                : 'text-on-surface-variant dark:text-zinc-400'
            }`}
            style={{ color: index === segments.length - 1 ? accentColor : undefined }}
            onMouseEnter={(e) => e.target.style.color = accentColor}
            onMouseLeave={(e) => e.target.style.color = index === segments.length - 1 ? accentColor : ''}
          >
            {segment}
          </span>
        </div>
      ))}

      <div className="flex-1" />
      
      <button onClick={refresh} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors text-on-surface-variant dark:text-zinc-400">
        <span className="material-symbols-outlined text-[18px]">refresh</span>
      </button>
    </div>
  );
}
