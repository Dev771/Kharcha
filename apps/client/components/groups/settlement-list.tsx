'use client';

import { Amount } from '@/components/ui/amount';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckCircle, HandCoins } from 'lucide-react';

export function SettlementList({ settlements }: { settlements: any[] }) {
  if (settlements.length === 0) {
    return <EmptyState icon={HandCoins} title="No settlements" description="Record a payment to settle up" compact />;
  }

  return (
    <div className="card-surface divide-y divide-[var(--border-light)]">
      {settlements.map((s: any, i: number) => (
        <div key={s.id} className="flex items-center gap-3 px-4 py-3 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="w-8 h-8 rounded-full bg-credit-bg flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-credit" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--foreground)]">
              <span className="font-medium">{s.paidBy?.name}</span> paid <span className="font-medium">{s.paidTo?.name}</span>
            </p>
            {s.note && <p className="text-xs text-[var(--text-muted)] truncate">{s.note}</p>}
            <p className="text-[10px] text-[var(--text-muted)]">
              {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <Amount paise={s.amountInPaise} size="sm" className="text-credit shrink-0" />
        </div>
      ))}
    </div>
  );
}
