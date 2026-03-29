import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-brand hover:bg-brand-dark rounded-xl',
        secondary: 'bg-[var(--subtle)] text-[var(--muted-foreground)] border border-[var(--border)] rounded-xl hover:bg-[var(--hover)]',
        ghost: 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--subtle)] rounded-xl',
        danger: 'bg-debit-bg text-debit border border-debit/20 rounded-xl',
        accent: 'bg-accent text-[#1A1816] rounded-xl shadow-sm hover:bg-accent-dark',
      },
      size: {
        sm: 'text-xs px-3 py-1.5 min-h-[32px] gap-1.5',
        md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2',
        lg: 'text-base px-6 py-3 min-h-[48px] gap-2',
        icon: 'p-2.5 min-h-[44px] min-w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-[var(--subtle)] text-[var(--muted-foreground)]',
        brand: 'bg-brand-light text-brand',
        credit: 'bg-credit-bg text-credit-dark',
        debit: 'bg-debit-bg text-debit-dark',
        warning: 'bg-warning-bg text-[#92400E]',
        info: 'bg-info-bg text-[#1E40AF]',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export const chipVariants = cva(
  'inline-flex items-center gap-1.5 font-medium rounded-full transition-all cursor-pointer whitespace-nowrap',
  {
    variants: {
      selected: {
        true: '',
        false: 'bg-[var(--subtle)] text-[var(--muted-foreground)] border border-[var(--border-light)] hover:bg-[var(--hover)]',
      },
      size: {
        sm: 'text-xs px-3 py-1 min-h-[28px]',
        md: 'text-sm px-3.5 py-1.5 min-h-[36px]',
      },
    },
    defaultVariants: {
      selected: false,
      size: 'md',
    },
  },
);
