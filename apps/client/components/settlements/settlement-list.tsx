'use client';

import { formatCurrency } from '@kharcha/shared';
import { Check, Clock, Banknote } from 'lucide-react';

interface Props {
  settlements: any[];
}

export function SettlementList({ settlements }: Props) {
  if (settlements.length === 0) {
    return (
      <div className="glass p-12 text-center">
        <Banknote className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-400">No settlements yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {settlements.map((s: any, i: number) => (
        <div
          key={s.id}
          className="glass p-4 flex items-center gap-3 anim-fade-up"
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-200">
              <span className="font-medium">{s.paidBy?.name}</span>
              {' paid '}
              <span className="font-medium">{s.paidTo?.name}</span>
              {' '}
              <span className="text-emerald-400 font-semibold">
                {formatCurrency(s.amountInPaise)}
              </span>
            </p>
            {s.note && (
              <p className="text-xs text-zinc-500 truncate">{s.note}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-600 flex-shrink-0">
            <Clock className="w-3 h-3" />
            {new Date(s.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
