import { useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import useSearchStore from '../../stores/useSearchStore';
import useFileStore from '../../stores/useFileStore';
import useUIStore from '../../stores/useUIStore';
import { getFileType } from '../../utils/fileTypes';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';

// Category config
const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'folder', label: 'Folders', icon: 'folder' },
  { id: 'document', label: 'Documents', icon: 'description' },
  { id: 'image', label: 'Images', icon: 'image' },
  { id: 'video', label: 'Videos', icon: 'movie' },
  { id: 'audio', label: 'Audio', icon: 'music_note' },
  { id: 'code', label: 'Code', icon: 'code' },
  { id: 'archive', label: 'Archives', icon: 'folder_zip' },
];

export default function SpotlightSearch() {
  const {
    isOpen, query, results, activeCategory, selectedIndex,
    searchTime, totalResults, isSearching, recentSearches,
    setQuery, setActiveCategory, setSelectedIndex, moveSelection,
    closeSpotlight, getFilteredResults, getCategories, addRecentSearch,
    clearRecentSearches,
  } = useSearchStore();

  const { navigateTo } = useFileStore();
  const { setCurrentView, accentColor, darkMode } = useUIStore();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const overlayRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay so the animation doesn't interfere with focus
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const filteredResults = useMemo(() => getFilteredResults(), [results, activeCategory]);
  const categoryCounts = useMemo(() => getCategories(), [results]);

  // Handle keyboard
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSpotlight();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredResults[selectedIndex];
      if (item) handleOpenResult(item);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Cycle through categories that have results
      const availableCats = CATEGORIES.filter(c => c.id === 'all' || categoryCounts[c.id]);
      const currentIdx = availableCats.findIndex(c => c.id === activeCategory);
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + availableCats.length) % availableCats.length
        : (currentIdx + 1) % availableCats.length;
      setActiveCategory(availableCats[nextIdx].id);
    }
  }, [filteredResults, selectedIndex, activeCategory, categoryCounts, closeSpotlight, moveSelection, setActiveCategory]);

  // Open result
  const handleOpenResult = useCallback((item) => {
    closeSpotlight();
    if (item.isDirectory) {
      setCurrentView('files');
      navigateTo(item.path);
    } else {
      // Navigate to parent directory and potentially highlight the file
      const parentPath = item.path.substring(0, item.path.lastIndexOf('\\'));
      if (parentPath) {
        setCurrentView('files');
        navigateTo(parentPath);
      }
    }
  }, [closeSpotlight, navigateTo, setCurrentView]);

  // Overlay click to close
  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) {
      closeSpotlight();
    }
  }, [closeSpotlight]);

  // Handle recent search click
  const handleRecentClick = useCallback((searchText) => {
    setQuery(searchText);
  }, [setQuery]);

  // Highlight matched text
  const highlightMatch = useCallback((name, q) => {
    if (!q) return name;
    const lowerName = name.toLowerCase();
    const lowerQuery = q.toLowerCase();
    const idx = lowerName.indexOf(lowerQuery);

    if (idx === -1) {
      // Fuzzy match — highlight each matched character
      const chars = [];
      let pi = 0;
      for (let i = 0; i < name.length; i++) {
        if (pi < lowerQuery.length && name[i].toLowerCase() === lowerQuery[pi]) {
          chars.push(
            <span key={i} style={{ color: accentColor, fontWeight: 700 }}>{name[i]}</span>
          );
          pi++;
        } else {
          chars.push(name[i]);
        }
      }
      return chars;
    }

    return (
      <>
        {name.substring(0, idx)}
        <span style={{ color: accentColor, fontWeight: 700 }}>
          {name.substring(idx, idx + q.length)}
        </span>
        {name.substring(idx + q.length)}
      </>
    );
  }, [accentColor, query]);

  // Truncate path for display
  const truncatePath = useCallback((fullPath) => {
    const parts = fullPath.split('\\');
    if (parts.length <= 4) return parts.join(' › ');
    return `${parts[0]} › ... › ${parts.slice(-3).join(' › ')}`;
  }, []);

  if (!isOpen) return null;

  const accentRGB = hexToRgb(accentColor);
  const accentBg = accentRGB ? `rgba(${accentRGB.r}, ${accentRGB.g}, ${accentRGB.b}, 0.08)` : 'rgba(0,100,255,0.08)';
  const accentBgHover = accentRGB ? `rgba(${accentRGB.r}, ${accentRGB.g}, ${accentRGB.b}, 0.12)` : 'rgba(0,100,255,0.12)';
  const accentBgActive = accentRGB ? `rgba(${accentRGB.r}, ${accentRGB.g}, ${accentRGB.b}, 0.18)` : 'rgba(0,100,255,0.18)';

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="spotlight-overlay"
      onKeyDown={handleKeyDown}
    >
      <div className="spotlight-container">
        {/* Search Input */}
        <div className="spotlight-input-wrapper">
          <span className="spotlight-search-icon material-symbols-outlined" style={{ color: isSearching ? accentColor : undefined }}>
            {isSearching ? 'progress_activity' : 'search'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Spotlight Search — find anything instantly..."
            className="spotlight-input"
            style={{ '--accent': accentColor }}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={filteredResults.length > 0}
            aria-controls="spotlight-results"
            aria-activedescendant={filteredResults.length > 0 ? `spotlight-item-${selectedIndex}` : undefined}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="spotlight-clear-btn"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          )}
          <div className="spotlight-shortcut-badge">
            <kbd>ESC</kbd>
          </div>
        </div>

        {/* Category Filters */}
        {query && results.length > 0 && (
          <div className="spotlight-categories">
            {CATEGORIES.map((cat) => {
              const count = cat.id === 'all' ? results.length : (categoryCounts[cat.id] || 0);
              if (cat.id !== 'all' && count === 0) return null;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`spotlight-category-pill ${isActive ? 'active' : ''}`}
                  style={isActive ? { backgroundColor: accentColor, color: '#fff' } : {}}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span className="spotlight-category-count">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Results */}
        <div className="spotlight-results-container" ref={listRef} id="spotlight-results" role="listbox">
          {/* No query — show recent searches */}
          {!query && (
            <div className="spotlight-empty-state">
              {recentSearches.length > 0 ? (
                <>
                  <div className="spotlight-section-header">
                    <span>Recent Searches</span>
                    <button onClick={clearRecentSearches} className="spotlight-clear-recent">Clear</button>
                  </div>
                  {recentSearches.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleRecentClick(s)}
                      className="spotlight-recent-item"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: 0.5 }}>history</span>
                      <span>{s}</span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="spotlight-hero">
                  <span className="material-symbols-outlined spotlight-hero-icon" style={{ color: accentColor }}>
                    bolt
                  </span>
                  <h3>Spotlight Search</h3>
                  <p>Type to search files, folders, documents, and more.<br />Results appear instantly as you type.</p>
                  <div className="spotlight-hints">
                    <span><kbd>↑↓</kbd> Navigate</span>
                    <span><kbd>↵</kbd> Open</span>
                    <span><kbd>Tab</kbd> Categories</span>
                    <span><kbd>Esc</kbd> Close</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Searching indicator */}
          {query && isSearching && results.length === 0 && (
            <div className="spotlight-searching">
              <div className="spotlight-pulse-ring" style={{ borderColor: accentColor }}></div>
              <span>Searching...</span>
            </div>
          )}

          {/* No results */}
          {query && !isSearching && results.length === 0 && (
            <div className="spotlight-no-results">
              <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>search_off</span>
              <p>No results for "<strong>{query}</strong>"</p>
              <p className="spotlight-no-results-hint">Try a different search term or check the path</p>
            </div>
          )}

          {/* Result items */}
          {filteredResults.map((item, index) => {
            const fileType = getFileType(item);
            const isSelected = index === selectedIndex;
            const parentPath = item.path.substring(0, item.path.lastIndexOf('\\'));

            return (
              <div
                key={item.path}
                data-index={index}
                id={`spotlight-item-${index}`}
                role="option"
                aria-selected={isSelected}
                className={`spotlight-result-item ${isSelected ? 'selected' : ''}`}
                style={isSelected ? { backgroundColor: accentBgActive } : {}}
                onClick={() => handleOpenResult(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {/* Icon */}
                <div className="spotlight-result-icon" style={{ backgroundColor: accentBg }}>
                  {item.isDirectory ? (
                    <span className="material-symbols-outlined filled" style={{ color: accentColor, fontSize: '22px' }}>folder</span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ color: fileType.color, fontSize: '22px' }}>{fileType.icon}</span>
                  )}
                </div>

                {/* Content */}
                <div className="spotlight-result-content">
                  <div className="spotlight-result-name">
                    {highlightMatch(item.name, query)}
                  </div>
                  <div className="spotlight-result-path">
                    {truncatePath(parentPath)}
                  </div>
                </div>

                {/* Meta */}
                <div className="spotlight-result-meta">
                  {!item.isDirectory && item.size != null && (
                    <span className="spotlight-result-size">{formatBytes(item.size)}</span>
                  )}
                  <span className="spotlight-result-date">{formatDate(item.modified)}</span>
                </div>

                {/* Category badge */}
                <div className="spotlight-result-badge" style={{ color: accentColor, backgroundColor: accentBg }}>
                  {item.category}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {query && (results.length > 0 || isSearching) && (
          <div className="spotlight-footer">
            <div className="spotlight-footer-stats">
              {isSearching ? (
                <span className="spotlight-live-indicator">
                  <span className="spotlight-live-dot" style={{ backgroundColor: accentColor }}></span>
                  Searching... {totalResults} found
                </span>
              ) : (
                <span>
                  <strong style={{ color: accentColor }}>{totalResults}</strong> results in{' '}
                  <strong style={{ color: accentColor }}>{searchTime}ms</strong>
                </span>
              )}
            </div>
            <div className="spotlight-footer-actions">
              <span><kbd>↵</kbd> Open</span>
              <span><kbd>↑↓</kbd> Navigate</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// Helper to convert hex to RGB
function hexToRgb(hex) {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}
