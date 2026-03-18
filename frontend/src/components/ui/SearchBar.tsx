import { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { searchSymbols } from '../../api/symbols';
import type { SearchResult } from '../../types';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useKeyboardShortcut('k', focusSearch);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await searchSymbols(query);
      setResults(res);
      setOpen(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-80">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search Ticker..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length > 0 && setOpen(true)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-16 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 bg-slate-800 border border-slate-700 rounded">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          {results.map(r => (
            <div
              key={r.ticker}
              className="flex items-center justify-between px-3 py-2 hover:bg-slate-800 cursor-pointer transition-colors"
              onClick={() => { setOpen(false); setQuery(''); }}
            >
              <div>
                <span className="text-sm font-semibold text-slate-100">{r.ticker}</span>
                <span className="ml-2 text-xs text-slate-500">{r.name}</span>
              </div>
              <span className="text-xs text-slate-600">{r.exchange}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
