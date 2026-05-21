import useUIStore from '../../stores/useUIStore';
import { VIEW_MODES } from '../../utils/constants';

export default function ViewToggle() {
  const { viewMode, setViewMode, accentColor } = useUIStore();

  return (
    <div className="flex items-center bg-surface-container-low dark:bg-zinc-900 p-1 rounded-full relative border border-surface-variant/30 dark:border-zinc-800 shrink-0">
      {/* Sliding background indicator */}
      <div 
        className={`absolute top-1 bottom-1 w-[32px] bg-white dark:bg-[#27272a] rounded-full shadow-sm transition-all duration-300 ease-out`}
        style={{
          left: viewMode === VIEW_MODES.LIST ? '4px' : '36px'
        }}
      />
      
      <button
        id="view-toggle-list"
        onClick={() => setViewMode(VIEW_MODES.LIST)}
        className={`relative z-10 w-8 h-6 flex items-center justify-center transition-colors ${
          viewMode === VIEW_MODES.LIST
            ? ''
            : 'text-on-surface-variant/60 dark:text-zinc-500 hover:text-on-surface-variant dark:hover:text-zinc-300'
        }`}
        style={viewMode === VIEW_MODES.LIST ? { color: accentColor } : {}}
        title="List view"
      >
        <span className="material-symbols-outlined text-[20px]" style={viewMode === VIEW_MODES.LIST ? { fontVariationSettings: '"wght" 600' } : {}}>view_list</span>
      </button>
      
      <button
        id="view-toggle-grid"
        onClick={() => setViewMode(VIEW_MODES.GRID)}
        className={`relative z-10 w-8 h-6 flex items-center justify-center transition-colors ${
          viewMode === VIEW_MODES.GRID
            ? ''
            : 'text-on-surface-variant/60 dark:text-zinc-500 hover:text-on-surface-variant dark:hover:text-zinc-300'
        }`}
        style={viewMode === VIEW_MODES.GRID ? { color: accentColor } : {}}
        title="Grid view"
      >
        <span className="material-symbols-outlined text-[20px]" style={viewMode === VIEW_MODES.GRID ? { fontVariationSettings: '"wght" 600' } : {}}>grid_view</span>
      </button>
    </div>
  );
}

