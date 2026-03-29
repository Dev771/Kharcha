'use client';

import { cn } from '@/lib/utils';

interface AmountInputProps {
  value: string;
  onChange: (val: string) => void;
  currency?: string;
  className?: string;
  autoFocus?: boolean;
}

export function AmountInput({ value, onChange, currency = '₹', className, autoFocus }: AmountInputProps) {
  return (
    <div className={cn('flex flex-col items-center py-6', className)}>
      <p className="text-xs text-[var(--muted-foreground)] mb-2">Enter amount</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-[var(--text-muted)]">{currency}</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) onChange(v);
          }}
          placeholder="0.00"
          autoFocus={autoFocus}
          className="text-4xl font-bold text-[var(--foreground)] bg-transparent outline-none w-40 text-center tabular-nums placeholder:text-[var(--text-muted)]"
        />
      </div>
      {value && parseFloat(value) > 0 && (
        <p className="text-xs text-[var(--text-muted)] mt-1">
          {Math.round(parseFloat(value) * 100)} paise
        </p>
      )}
    </div>
  );
}
