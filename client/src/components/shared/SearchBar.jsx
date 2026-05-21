import { useState, useRef, useEffect } from 'react';
import useFileStore from '../../stores/useFileStore';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const { search, clearSearch, searchQuery } = useFileStore();
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!searchQuery) setQuery('');
  }, [searchQuery]);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Debounce search
    clearTimeout(timerRef.current);
    if (value.trim()) {
      timerRef.current = setTimeout(() => search(value.trim()), 300);
    } else {
      clearSearch();
    }
  };

  const handleClear = () => {
    setQuery('');
    clearSearch();
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-[400px] group">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">
        search
      </span>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        className="w-full h-10 pl-10 pr-10 bg-surface-container-low border border-surface-variant rounded-xl
                   text-sm text-on-surface placeholder:text-outline
                   focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-surface-container-lowest
                   transition-all shadow-sm"
        placeholder="Search files, folders, and drives..."
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}
