import { useEffect, useRef, useState } from 'react';

type HeaderProps = {
  search: string;
  onSearch: (value: string) => void;
  onMenu: () => void;
  onRefresh: () => void;
  onFilter: (filter: string) => void;
};

const filters = ['All', 'Scheduled', 'Sent', 'Failed'];

export default function Header({ search, onSearch, onMenu, onRefresh, onFilter }: HeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !filterRef.current?.contains(event.target)) setFilterOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [filterOpen]);

  return (
    <header className="sticky top-0 z-30 flex min-h-[52px] items-center gap-3 border-b border-border bg-background px-4 sm:px-7">
      <button type="button" className="rounded-control p-2 text-muted hover:bg-surface lg:hidden" onClick={onMenu} aria-label="Open navigation menu">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
      </button>
      <div className="relative flex w-full max-w-[680px] items-center gap-1">
        <label className="flex h-8 min-w-0 w-full max-w-[560px] items-center gap-2 rounded-pill bg-surface px-3 text-muted focus-within:ring-2 focus-within:ring-focus" htmlFor="globalSearch">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none"><circle cx="10.8" cy="10.8" r="6.4" stroke="currentColor" strokeWidth="1.6" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <input id="globalSearch" type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search" className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-text outline-none placeholder:text-muted" />
        </label>
        <div className="relative" ref={filterRef}>
          <button type="button" aria-label="Filter emails" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)} className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-surface hover:text-text">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none"><path d="M4 6h16l-6.3 7.1v4.6l-3.4 1.8v-6.4L4 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
          </button>
          {filterOpen && <div className="absolute right-0 top-11 z-40 w-36 rounded-control border border-border bg-background p-1 shadow-panel" role="menu" aria-label="Filter emails">
            {filters.map((filter) => <button key={filter} type="button" role="menuitem" onClick={() => { onFilter(filter.toLowerCase()); setFilterOpen(false); }} className="block w-full rounded-control px-3 py-2 text-left text-xs text-text hover:bg-primary-tint">{filter}</button>)}
          </div>}
        </div>
        <button type="button" aria-label="Refresh email list" onClick={onRefresh} className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-surface hover:text-text">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none"><path d="M20 7v5h-5M4.6 9a7.5 7.5 0 0 1 12.5-2L20 12M4 17v-5h5m10.4 3a7.5 7.5 0 0 1-12.5 2L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </header>
  );
}
