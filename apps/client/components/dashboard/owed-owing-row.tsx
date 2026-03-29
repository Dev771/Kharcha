'use client';

import { Amount } from '@/components/ui/amount';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  owedInPaise: number;
  owingInPaise: number;
}

export function OwedOwingRow({ owedInPaise, owingInPaise }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card-surface p-4">
        <div className="w-8 h-8 rounded-lg bg-credit-bg flex items-center justify-center mb-2">
          <TrendingUp className="w-4 h-4 text-credit" />
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mb-1">I'm owed</p>
        <Amount paise={owedInPaise} size="lg" className="text-credit" />
      </div>
      <div className="card-surface p-4">
        <div className="w-8 h-8 rounded-lg bg-debit-bg flex items-center justify-center mb-2">
          <TrendingDown className="w-4 h-4 text-debit" />
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mb-1">I owe</p>
        <Amount paise={owingInPaise} size="lg" className="text-debit" />
      </div>
    </div>
  );
}
