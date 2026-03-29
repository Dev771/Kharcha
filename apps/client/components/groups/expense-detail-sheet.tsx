'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Amount } from '@/components/ui/amount';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Badge } from '@/components/ui/badge';

interface Props {
  expense: any | null;
  onClose: () => void;
}

export function ExpenseDetailSheet({ expense, onClose }: Props) {
  if (!expense) return null;

  return (
    <BottomSheet open={!!expense} onClose={onClose} title="Expense Details">
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--foreground)] tabular-nums">
            <Amount paise={expense.amountInPaise} size="xl" />
          </p>
          <p className="text-sm text-[var(--foreground)] font-medium mt-1">{expense.description}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            {expense.category && <Badge variant="brand">{expense.category}</Badge>}
            <Badge>{expense.splitType}</Badge>
          </div>
        </div>

        {/* Paid by + date */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <MemberAvatar name={expense.paidBy?.name || 'Unknown'} size="sm" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">Paid by</p>
              <p className="text-sm font-medium text-[var(--foreground)]">{expense.paidBy?.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Date</p>
            <p className="text-sm text-[var(--foreground)]">
              {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Split breakdown */}
        {expense.splits && expense.splits.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Split Breakdown</p>
            <div className="card-surface divide-y divide-[var(--border-light)]">
              {expense.splits.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MemberAvatar name={s.user?.name || 'Unknown'} size="xs" />
                    <span className="text-sm text-[var(--foreground)]">{s.user?.name}</span>
                  </div>
                  <Amount paise={s.owedAmountInPaise} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
