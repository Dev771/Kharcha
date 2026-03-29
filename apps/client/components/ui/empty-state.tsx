'use client';

import { cn } from '@/lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, compact, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center animate-fade-in', compact ? 'py-8 px-4' : 'py-16 px-6', className)}>
      <div className={cn('rounded-2xl bg-[var(--subtle)] flex items-center justify-center mb-4', compact ? 'w-12 h-12' : 'w-16 h-16')}>
        <Icon size={compact ? 20 : 28} className="text-[var(--muted-foreground)]" />
      </div>
      <h3 className={cn('font-semibold text-[var(--foreground)]', compact ? 'text-sm mb-0.5' : 'text-md mb-1')}>{title}</h3>
      <p className={cn('text-[var(--muted-foreground)] max-w-xs', compact ? 'text-xs' : 'text-sm')}>{description}</p>
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}
