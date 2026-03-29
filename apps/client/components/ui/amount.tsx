'use client';

import { formatCurrency } from '@kharcha/shared';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const amountVariants = cva('tabular-nums', {
  variants: {
    size: {
      sm: 'text-sm',
      base: 'text-base font-medium',
      lg: 'text-lg font-semibold',
      xl: 'text-xl font-bold',
      hero: 'text-3xl font-bold tracking-tight',
    },
  },
  defaultVariants: { size: 'base' },
});

interface AmountProps extends VariantProps<typeof amountVariants> {
  paise: number;
  currency?: string;
  showSign?: boolean;
  colorize?: boolean;
  className?: string;
}

export function Amount({ paise, currency = 'INR', showSign, colorize, size, className }: AmountProps) {
  const isPositive = paise >= 0;
  const sign = showSign ? (isPositive ? '+' : '') : '';
  const formatted = formatCurrency(Math.abs(paise), currency);

  return (
    <span
      className={cn(
        amountVariants({ size }),
        colorize && isPositive && 'text-credit',
        colorize && !isPositive && 'text-debit',
        className,
      )}
    >
      {sign}{paise < 0 && !showSign ? '-' : ''}{formatted}
    </span>
  );
}
