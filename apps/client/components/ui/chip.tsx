'use client';

import { cn } from '@/lib/utils';

interface ChipProps {
  label: string;
  icon?: React.ElementType;
  selected?: boolean;
  selectedColor?: string;
  onClick?: () => void;
  className?: string;
}

export function Chip({ label, icon: Icon, selected, selectedColor, onClick, className }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all min-h-[36px]',
        selected
          ? 'text-white shadow-sm'
          : 'bg-[var(--subtle)] text-[var(--muted-foreground)] border border-[var(--border-light)] hover:bg-[var(--hover)]',
        className,
      )}
      style={selected ? { backgroundColor: selectedColor || 'var(--primary)' } : undefined}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
