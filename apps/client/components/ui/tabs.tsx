'use client';

import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
  icon?: React.ElementType;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto scrollbar-hide', className)}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap min-h-[44px] border-b-2 transition-colors',
              isActive
                ? 'text-[var(--primary)] border-[var(--primary)]'
                : 'text-[var(--muted-foreground)] border-transparent hover:text-[var(--foreground)]',
            )}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
