'use client';

import { formatCurrency } from '@kharcha/shared';
import { Sparkles, ArrowRight, User } from 'lucide-react';

interface Props {
  data: {
    settlements: {
      from: { id: string; name: string };
      to: { id: string; name: string };
      amountInPaise: number;
    }[];
    simplifiedTransactionCount: number;
    originalTransactionCount: number;
  };
  onSettle: (from: string, to: string, amount: number) => void;
}

export function SimplifiedView({ data, onSettle }: Props) {
  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="glass p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </div>
        <p className="text-sm text-zinc-300">
          Debts simplified to{' '}
          <span className="font-semibold text-cyan-400">
            {data.simplifiedTransactionCount} payment
            {data.simplifiedTransactionCount !== 1 ? 's' : ''}
          </span>{' '}
          <span className="text-zinc-500">
            (from {data.originalTransactionCount} balances)
          </span>
        </p>
      </div>

      {/* Settlement cards */}
      {data.settlements.length === 0 ? (
        <div className="glass p-12 text-center">
          <p className="text-sm text-zinc-400">All settled up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.settlements.map((s, i) => (
            <div
              key={`${s.from.id}-${s.to.id}`}
              className="glass p-5 flex items-center gap-4 anim-fade-up"
              style={{
                animationDelay: `${i * 0.06}s`,
                background:
                  'linear-gradient(135deg, rgba(6,182,212,0.04) 0%, transparent 50%)',
              }}
            >
              {/* From avatar */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center"
                  style={{ boxShadow: '0 0 20px rgba(244,63,94,0.15)' }}
                >
                  <User className="w-4 h-4 text-rose-400" />
                </div>
                <span className="text-[10px] text-zinc-500 max-w-[60px] truncate">
                  {s.from.name}
                </span>
              </div>

              {/* Arrow + amount */}
              <div className="flex-1 flex flex-col items-center gap-1">
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <p
                  className="text-xl font-bold text-white"
                  style={{ textShadow: '0 0 30px rgba(6,182,212,0.2)' }}
                >
                  {formatCurrency(s.amountInPaise)}
                </p>
              </div>

              {/* To avatar */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center"
                  style={{ boxShadow: '0 0 20px rgba(16,185,129,0.15)' }}
                >
                  <User className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[10px] text-zinc-500 max-w-[60px] truncate">
                  {s.to.name}
                </span>
              </div>

              {/* Settle button */}
              <button
                onClick={() =>
                  onSettle(s.from.id, s.to.id, s.amountInPaise)
                }
                className="btn-primary px-4 py-2 text-xs flex-shrink-0"
              >
                Settle Up
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
