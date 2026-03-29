'use client';

import { formatCurrency } from '@kharcha/shared';
import { User } from 'lucide-react';

interface BalanceEntry {
  userId: string;
  userName: string;
  netInPaise: number;
}

interface Props {
  balances: BalanceEntry[];
}

export function DetailedView({ balances }: Props) {
  const sorted = [...balances].sort((a, b) => b.netInPaise - a.netInPaise);

  return (
    <div className="space-y-2">
      {sorted.map((b, i) => (
        <div
          key={b.userId}
          className="glass p-4 flex items-center gap-4 anim-fade-up"
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          <div className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-200">{b.userName}</p>
            <p className="text-xs text-zinc-500">
              {b.netInPaise > 0
                ? 'gets back'
                : b.netInPaise < 0
                  ? 'owes'
                  : 'settled up'}
            </p>
          </div>
          <p
            className={`text-sm font-semibold ${b.netInPaise > 0 ? 'text-emerald-400' : b.netInPaise < 0 ? 'text-rose-400' : 'text-zinc-500'}`}
          >
            {b.netInPaise !== 0
              ? `${b.netInPaise > 0 ? '+' : ''}${formatCurrency(Math.abs(b.netInPaise))}`
              : 'Settled'}
          </p>
        </div>
      ))}
    </div>
  );
}
