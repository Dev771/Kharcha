'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftAddon, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-[var(--muted-foreground)]">{label}</label>
      )}
      <div className="relative flex items-center">
        {leftAddon && (
          <span className="absolute left-3 flex items-center justify-center text-sm text-[var(--text-muted)] pointer-events-none">
            {leftAddon}
          </span>
        )}
        <input
          ref={ref}
          className={cn('input-field', leftAddon && 'pl-10', error && 'border-debit', className)}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-debit">{error}</p>}
    </div>
  ),
);
Input.displayName = 'Input';
