'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@kharcha/shared';
import { Chip } from '@/components/ui/chip';

interface Props {
  filters: Record<string, string | undefined>;
  onFilterChange: (key: string, value: string | undefined) => void;
}

export function ExpenseFilters({ filters, onFilterChange }: Props) {
  const [search, setSearch] = useState(filters.search || '');

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); onFilterChange('search', e.target.value || undefined); }}
          placeholder="Search expenses..."
          className="input-field pl-10"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
        <Chip label="All" selected={!filters.category} onClick={() => onFilterChange('category', undefined)} />
        {EXPENSE_CATEGORIES.map((c) => (
          <Chip key={c} label={c} selected={filters.category === c} onClick={() => onFilterChange('category', filters.category === c ? undefined : c)} />
        ))}
      </div>
    </div>
  );
}
