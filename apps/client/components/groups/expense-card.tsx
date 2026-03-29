'use client';

import { Amount } from '@/components/ui/amount';
import { Receipt } from 'lucide-react';

interface Props {
  expense: any;
  onClick?: () => void;
  index?: number;
}

export function ExpenseCard({ expense, onClick, index = 0 }: Props) {
  return (
    <button onClick={onClick} className="w-full card-interactive p-3 flex items-center gap-3 text-left animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
        <Receipt className="w-4 h-4 text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)] truncate">{expense.description}</p>
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
          {expense.paidBy?.name || 'Unknown'} · {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          {expense.category ? ` · ${expense.category}` : ''}
        </p>
      </div>
      <Amount paise={expense.amountInPaise} size="sm" className="font-semibold shrink-0" />
    </button>
  );
}
