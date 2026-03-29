'use client';

import { formatCurrency } from '@kharcha/shared';

interface BalanceCardProps {
  netInPaise: number;
}

export function BalanceCard({ netInPaise }: BalanceCardProps) {
  const isPositive = netInPaise >= 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-brand">
      <p className="text-xs font-medium text-white/70 mb-1">Current Balance</p>
      <p className="text-3xl font-bold tracking-tight tabular-nums">
        {isPositive ? '+' : '-'}{formatCurrency(Math.abs(netInPaise))}
      </p>
      <p className="text-xs text-white/60 mt-2">
        {netInPaise > 0 ? "You're owed overall" : netInPaise < 0 ? 'You owe overall' : 'All settled up!'}
      </p>
    </div>
  );
}
