import { create } from 'zustand';
import useFileStore from './useFileStore';

const RECENT_SEARCHES_KEY = 'spotlight_recent_searches';
const MAX_RECENT = 5;

const useSearchStore = create((set, get) => ({
  // State
  query: '',
  results: [],
  activeCategory: 'all',
  selectedIndex: -1,
  searchTime: 0,
  totalResults: 0,
  isSearching: false,
  isActive: false, // true when search mode is active (query has text)
  recentSearches: JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]'),

  // Internal
  _eventSource: null,
  _debounceTimer: null,

  // Actions
  setQuery: (query) => {
    const { _eventSource, _debounceTimer } = get();
    // Cancel previous search
    if (_eventSource) { _eventSource.close(); }
    if (_debounceTimer) { clearTimeout(_debounceTimer); }

    if (!query.trim()) {
      set({ query, results: [], isSearching: false, isActive: false, searchTime: 0, totalResults: 0, selectedIndex: -1, activeCategory: 'all', _eventSource: null, _debounceTimer: null });
      return;
    }

    set({ query, isSearching: true, isActive: true, selectedIndex: -1 });

    // Ultra-fast debounce — 60ms
    const timer = setTimeout(() => {
      get()._startStreamSearch(query.trim());
    }, 60);

    set({ _debounceTimer: timer });
  },

  clearSearch: () => {
    const { _eventSource, _debounceTimer } = get();
    if (_eventSource) { _eventSource.close(); }
    if (_debounceTimer) { clearTimeout(_debounceTimer); }
    set({ query: '', results: [], isSearching: false, isActive: false, searchTime: 0, totalResults: 0, selectedIndex: -1, activeCategory: 'all', _eventSource: null, _debounceTimer: null });
  },

  setActiveCategory: (category) => {
    set({ activeCategory: category, selectedIndex: -1 });
  },

  setSelectedIndex: (index) => {
    set({ selectedIndex: index });
  },

  getFilteredResults: () => {
    const { results, activeCategory } = get();
    if (activeCategory === 'all') return results;
    return results.filter(r => r.category === activeCategory);
  },

  getCategories: () => {
    const { results } = get();
    const counts = {};
    for (const r of results) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
    return counts;
  },

  addRecentSearch: (query) => {
    if (!query.trim()) return;
    const recent = get().recentSearches.filter(s => s !== query.trim());
    const updated = [query.trim(), ...recent].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    set({ recentSearches: updated });
  },

  clearRecentSearches: () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    set({ recentSearches: [] });
  },

  // Internal: start SSE streaming search
  _startStreamSearch: (query) => {
    const { _eventSource } = get();
    if (_eventSource) _eventSource.close();

    // Get current path from fileStore
    const searchPath = useFileStore.getState().currentPath || 'C:\\';

    const url = `/api/files/search/stream?q=${encodeURIComponent(query)}&path=${encodeURIComponent(searchPath)}`;
    const startTime = performance.now();

    const es = new EventSource(url);
    set({ _eventSource: es, results: [], isSearching: true, searchTime: 0, totalResults: 0 });

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'results') {
          set((state) => {
            const newResults = [...state.results, ...data.items];
            // Sort by score
            newResults.sort((a, b) => b.score - a.score || a.depth - b.depth);
            return {
              results: newResults,
              totalResults: newResults.length,
              searchTime: Math.round(performance.now() - startTime),
            };
          });
        } else if (data.type === 'done') {
          const elapsed = Math.round(performance.now() - startTime);
          set({
            isSearching: false,
            searchTime: elapsed,
            totalResults: data.totalResults,
          });
          es.close();
          set({ _eventSource: null });

          // Save to recent searches
          get().addRecentSearch(query);
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      es.close();
      set({ isSearching: false, _eventSource: null });
    };
  },
}));

export default useSearchStore;
