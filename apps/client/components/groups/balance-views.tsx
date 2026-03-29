'use client';

import { Amount } from '@/components/ui/amount';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Button } from '@/components/ui/button';
import { ArrowDown, TrendingUp } from 'lucide-react';

interface SimplifiedProps {
  data: any;
  onSettle: (fromId: string, toId: string, amount: number) => void;
}

export function SimplifiedView({ data, onSettle }: SimplifiedProps) {
  const settlements = data?.settlements || [];

  return (
    <div className="space-y-3">
      {settlements.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-credit-bg">
          <TrendingUp className="w-4 h-4 text-credit shrink-0" />
          <p className="text-xs text-credit-dark font-medium">
            {settlements.length} payment{settlements.length !== 1 ? 's' : ''} to settle all debts
          </p>
        </div>
      )}

      {settlements.map((s: any, i: number) => (
        <div key={i} className="card-surface p-4 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
          {/* Stacked layout: from → to on top, amount + button below */}
          <div className="flex items-center gap-2 mb-3">
            <MemberAvatar name={s.from.name} size="xs" />
            <span className="text-sm font-medium text-[var(--foreground)] truncate">{s.from.name}</span>
            <ArrowDown className="w-3 h-3 text-[var(--text-muted)] shrink-0 rotate-[-90deg]" />
            <MemberAvatar name={s.to.name} size="xs" />
            <span className="text-sm font-medium text-[var(--foreground)] truncate">{s.to.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <Amount paise={s.amountInPaise} size="lg" className="text-debit" />
            <Button variant="primary" size="sm" onClick={() => onSettle(s.from.id, s.to.id, s.amountInPaise)}>
              Settle
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface DetailedProps {
  balances: any[];
}

export function DetailedView({ balances }: DetailedProps) {
  return (
    <div className="card-surface divide-y divide-[var(--border-light)] overflow-hidden">
      {balances.map((b: any, i: number) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MemberAvatar name={b.userName || 'Unknown'} size="sm" />
            <span className="text-sm text-[var(--foreground)] truncate">{b.userName}</span>
          </div>
          <Amount paise={b.netInPaise} showSign colorize size="sm" className="shrink-0" />
        </div>
      ))}
    </div>
  );
}
