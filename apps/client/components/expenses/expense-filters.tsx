'use client';

import { Search, X } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@kharcha/shared';
import { cn } from '@/lib/utils';
import { useRef, useEffect, useState } from 'react';

interface Props {
  filters: Record<string, string | undefined>;
  onFilterChange: (key: string, value: string | undefined) => void;
}

export function ExpenseFilters({ filters, onFilterChange }: Props) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      onFilterChange('search', searchInput || undefined);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput, onFilterChange]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search expenses..."
          className="input-dark pl-10"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {EXPENSE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              onFilterChange(
                'category',
                filters.category === cat ? undefined : cat,
              )
            }
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border',
              filters.category === cat
                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.06]',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={() => {
            setSearchInput('');
            onFilterChange('category', undefined);
            onFilterChange('search', undefined);
          }}
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Clear filters
        </button>
      )}
    </div>
  );
}
