import { useMemo, useCallback, useRef, useEffect } from 'react';
import useSearchStore from '../../stores/useSearchStore';
import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';
import { getFileType } from '../../utils/fileTypes';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';

// Category config
const CATEGORIES = [
  { id: 'all', label: 'All Results', icon: 'apps' },
  { id: 'folder', label: 'Folders', icon: 'folder' },
  { id: 'document', label: 'Documents', icon: 'description' },
  { id: 'image', label: 'Images', icon: 'image' },
  { id: 'video', label: 'Videos', icon: 'movie' },
  { id: 'audio', label: 'Audio', icon: 'music_note' },
  { id: 'code', label: 'Code', icon: 'code' },
  { id: 'archive', label: 'Archives', icon: 'folder_zip' },
  { id: 'executable', label: 'Apps', icon: 'terminal' },
  { id: 'other', label: 'Other', icon: 'draft' },
];

export default function SearchResultsView() {
  const {
    query, results, activeCategory, selectedIndex,
    searchTime, totalResults, isSearching,
    setActiveCategory, setSelectedIndex, getFilteredResults, getCategories,
  } = useSearchStore();

  const { navigateTo } = useFileStore();
  const { setCurrentView, accentColor } = useUIStore();
  const containerRef = useRef(null);

  const filteredResults = useMemo(() => getFilteredResults(), [results, activeCategory]);
  const categoryCounts = useMemo(() => getCategories(), [results]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex < 0 || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-idx="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  const handleOpenResult = useCallback((item) => {
    if (item.isDirectory) {
      setCurrentView('files');
      navigateTo(item.path);
      useSearchStore.getState().clearSearch();
    } else {
      // Navigate to parent folder
      const parentPath = item.path.substring(0, item.path.lastIndexOf('\\'));
      if (parentPath) {
        setCurrentView('files');
        navigateTo(parentPath);
        useSearchStore.getState().clearSearch();
      }
    }
  }, [navigateTo, setCurrentView]);

  // Highlight matched text in filename
  const highlightMatch = useCallback((name) => {
    if (!query) return name;
    const lowerName = name.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerName.indexOf(lowerQuery);

    if (idx === -1) {
      // Fuzzy highlight
      const chars = [];
      let pi = 0;
      for (let i = 0; i < name.length; i++) {
        if (pi < lowerQuery.length && name[i].toLowerCase() === lowerQuery[pi]) {
          chars.push(<span key={i} className="search-highlight" style={{ color: accentColor, fontWeight: 700 }}>{name[i]}</span>);
          pi++;
        } else {
          chars.push(<span key={i}>{name[i]}</span>);
        }
      }
      return chars;
    }

    return (
      <>
        {name.substring(0, idx)}
        <span className="search-highlight" style={{ color: accentColor, fontWeight: 700 }}>{name.substring(idx, idx + query.length)}</span>
        {name.substring(idx + query.length)}
      </>
    );
  }, [query, accentColor]);

  // Truncate path
  const formatPath = useCallback((fullPath) => {
    const parentPath = fullPath.substring(0, fullPath.lastIndexOf('\\'));
    const parts = parentPath.split('\\');
    if (parts.length <= 5) return parts.join(' › ');
    return `${parts.slice(0, 2).join(' › ')} › ... › ${parts.slice(-2).join(' › ')}`;
  }, []);

  const accentRgb = hexToRgb(accentColor);
  const accentBg = accentRgb ? `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.07)` : 'rgba(0,100,255,0.07)';
  const accentBgSelected = accentRgb ? `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.13)` : 'rgba(0,100,255,0.13)';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header bar with stats and category filters */}
      <div className="px-8 py-4 flex flex-col gap-3 shrink-0">
        {/* Title and stats row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px]" style={{ color: accentColor }}>
              {isSearching ? 'progress_activity' : 'manage_search'}
            </span>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-on-surface dark:text-zinc-100">
                Search Results
              </h2>
              <p className="text-[13px] text-on-surface-variant dark:text-zinc-400 mt-0.5">
                {isSearching ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></span>
                    Searching... {totalResults} found so far
                  </span>
                ) : totalResults > 0 ? (
                  <span>
                    Found <strong style={{ color: accentColor }}>{totalResults}</strong> results in{' '}
                    <strong style={{ color: accentColor }}>{searchTime < 1000 ? `${searchTime}ms` : `${(searchTime / 1000).toFixed(1)}s`}</strong>
                    {' '}for "<strong>{query}</strong>"
                  </span>
                ) : (
                  <span>No results found for "<strong>{query}</strong>"</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Category filter pills */}
        {results.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {CATEGORIES.map((cat) => {
              const count = cat.id === 'all' ? results.length : (categoryCounts[cat.id] || 0);
              if (cat.id !== 'all' && count === 0) return null;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150 whitespace-nowrap border ${
                    isActive
                      ? 'text-white border-transparent shadow-sm'
                      : 'text-on-surface-variant dark:text-zinc-400 bg-white/60 dark:bg-zinc-800/40 border-surface-variant/30 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800'
                  }`}
                  style={isActive ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', ...(isActive ? {} : { color: accentColor }) }}>{cat.icon}</span>
                  {cat.label}
                  <span className={`text-[10px] font-bold ${isActive ? 'text-white/80' : 'text-on-surface-variant/60 dark:text-zinc-500'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-surface-variant/30 dark:bg-zinc-800/60 mx-6"></div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto px-4 py-2" ref={containerRef}>
        {/* Loading skeleton */}
        {isSearching && results.length === 0 && (
          <div className="flex flex-col gap-1 py-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-10 h-10 rounded-xl skeleton shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton w-48 rounded-md" style={{ animationDelay: `${i * 60 + 100}ms` }}></div>
                  <div className="h-3 skeleton w-72 rounded-md" style={{ animationDelay: `${i * 60 + 200}ms` }}></div>
                </div>
                <div className="h-3 skeleton w-16 rounded-md shrink-0"></div>
              </div>
            ))}
          </div>
        )}

        {/* No results state */}
        {!isSearching && results.length === 0 && query && (
          <div className="flex flex-col items-center justify-center py-24 text-center h-full">
            <div className="relative mb-6">
              {/* Custom Theme-Aware SVG Illustration */}
              <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background decorative elements */}
                <circle cx="100" cy="100" r="80" fill="currentColor" className="text-surface-variant/20 dark:text-zinc-800/50" />
                <path d="M140 60 L160 80 M40 140 L60 160" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-surface-variant/40 dark:text-zinc-700" />
                <circle cx="160" cy="50" r="6" fill="currentColor" className="text-surface-variant/40 dark:text-zinc-700" />
                <circle cx="40" cy="150" r="4" fill="currentColor" className="text-surface-variant/40 dark:text-zinc-700" />
                
                {/* Main search glass */}
                <circle cx="90" cy="90" r="40" fill="white" className="dark:fill-[#1c1c1f]" stroke={accentColor} strokeWidth="8" />
                <path d="M118 118 L150 150" stroke={accentColor} strokeWidth="12" strokeLinecap="round" />
                
                {/* Cross/No results indicator inside glass */}
                <path d="M75 75 L105 105 M105 75 L75 105" stroke={accentColor} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
                
                {/* Accent glow behind glass */}
                <circle cx="90" cy="90" r="30" fill={accentColor} opacity="0.1" className="animate-pulse" />
              </svg>
            </div>
            <h3 className="text-[20px] font-bold text-on-surface dark:text-zinc-200 mb-2">No results found</h3>
            <p className="text-[14px] text-on-surface-variant dark:text-zinc-500 max-w-[320px] leading-relaxed">
              We couldn't find anything matching "<strong className="text-on-surface dark:text-zinc-300">{query}</strong>". Try adjusting your keywords or search path.
            </p>
          </div>
        )}

        {/* Result rows */}
        {filteredResults.map((item, index) => {
          const fileType = getFileType(item);
          const isSelected = index === selectedIndex;

          return (
            <div
              key={item.path}
              data-idx={index}
              className={`search-result-row group flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-100 ${
                isSelected ? 'ring-1' : ''
              }`}
              style={{
                backgroundColor: isSelected ? accentBgSelected : undefined,
                '--tw-ring-color': isSelected ? accentColor + '40' : 'transparent',
              }}
              onClick={() => handleOpenResult(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              onDoubleClick={() => handleOpenResult(item)}
            >
              {/* File icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105"
                style={{ backgroundColor: accentBg }}
              >
                {item.isDirectory ? (
                  <span className="material-symbols-outlined filled" style={{ color: accentColor, fontSize: '22px' }}>folder</span>
                ) : (
                  <span className="material-symbols-outlined" style={{ color: fileType.color, fontSize: '22px' }}>{fileType.icon}</span>
                )}
              </div>

              {/* Name + path */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-on-surface dark:text-zinc-100 truncate leading-snug">
                  {highlightMatch(item.name)}
                </div>
                <div className="text-[11px] text-on-surface-variant dark:text-zinc-500 truncate mt-0.5 font-mono">
                  {formatPath(item.path)}
                </div>
              </div>

              {/* Category tag */}
              <div
                className="hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0"
                style={{ color: accentColor, backgroundColor: accentBg }}
              >
                {item.category}
              </div>

              {/* Size */}
              {!item.isDirectory && item.size != null && (
                <div className="text-[12px] font-medium text-on-surface-variant dark:text-zinc-400 shrink-0 tabular-nums w-16 text-right">
                  {formatBytes(item.size)}
                </div>
              )}
              {item.isDirectory && (
                <div className="text-[12px] font-medium text-on-surface-variant/50 dark:text-zinc-600 shrink-0 w-16 text-right">
                  —
                </div>
              )}

              {/* Modified date */}
              <div className="text-[12px] text-on-surface-variant dark:text-zinc-500 shrink-0 hidden md:block w-28 text-right tabular-nums">
                {formatDate(item.modified)}
              </div>

              {/* Open arrow */}
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant/30 dark:text-zinc-700 group-hover:text-on-surface-variant dark:group-hover:text-zinc-400 transition-colors shrink-0">
                chevron_right
              </span>
            </div>
          );
        })}

        {/* Live count while searching */}
        {isSearching && results.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-on-surface-variant dark:text-zinc-500">
            <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></span>
            Still searching... {totalResults} results found
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-4"></div>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}
