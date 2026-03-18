import { SearchBar } from '../ui/SearchBar';

export function TopHeader() {
  return (
    <header className="h-14 bg-slate-950 border-b border-slate-800/60 flex items-center justify-between px-6 shrink-0">
      <div />
      <SearchBar />
    </header>
  );
}
