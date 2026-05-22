import { useEffect, useRef, useState } from 'react';
import useSearchStore from '../../stores/useSearchStore';

export default function SharedSearchInput() {
  const { setQuery, query } = useSearchStore();
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState(query || '');

  // Keep local value synced if store query changes elsewhere
  useEffect(() => {
    setLocalValue(query || '');
  }, [query]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    setQuery(val);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="Search in shared folder..."
      value={localValue}
      onChange={handleChange}
      autoComplete="off"
      spellCheck={false}
      className="w-full h-11 pl-12 pr-24 bg-white dark:bg-[#1c1c1f] rounded-full font-body-md text-[14px] text-on-surface dark:text-zinc-100 placeholder:text-outline dark:placeholder:text-zinc-500 border border-surface-variant/40 dark:border-zinc-800/80 focus:outline-none focus:ring-2 transition-all shadow-sm"
    />
  );
}

