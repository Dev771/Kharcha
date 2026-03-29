'use client';

import { formatCurrency } from '@kharcha/shared';
import { TrendingUp, TrendingDown, ArrowRightLeft, Plus } from 'lucide-react';
import Link from 'next/link';

interface Props {
  totalOwedInPaise: number;
  totalOwingInPaise: number;
}

export function BalanceBento({ totalOwedInPaise, totalOwingInPaise }: Props) {
  const net = totalOwedInPaise - totalOwingInPaise;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Net Balance — large card */}
      <div className="col-span-2 row-span-2 glass p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
            Net Balance
          </p>
          <p
            className={`text-3xl md:text-4xl font-bold tracking-tight ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
            style={{
              textShadow: `0 0 40px ${net >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
            }}
          >
            {net >= 0 ? '+' : ''}
            {formatCurrency(Math.abs(net))}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            {net > 0
              ? 'Others owe you overall'
              : net < 0
                ? 'You owe others overall'
                : 'All settled up'}
          </p>
        </div>
      </div>

      {/* Owed to you */}
      <div className="glass p-4 group">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
        <p className="text-xs text-zinc-500 mb-1">Owed to you</p>
        <p className="text-lg font-semibold text-emerald-400">
          {formatCurrency(totalOwedInPaise)}
        </p>
      </div>

      {/* You owe */}
      <div className="glass p-4 group">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
        </div>
        <p className="text-xs text-zinc-500 mb-1">You owe</p>
        <p className="text-lg font-semibold text-rose-400">
          {formatCurrency(totalOwingInPaise)}
        </p>
      </div>

      {/* Quick actions */}
      <Link
        href="/groups"
        className="glass p-4 flex items-center gap-3 hover:border-cyan-500/20 transition-all"
      >
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <span className="text-xs font-medium text-zinc-400">Quick Settle</span>
      </Link>

      <Link
        href="/groups"
        className="glass p-4 flex items-center gap-3 hover:border-teal-500/20 transition-all"
      >
        <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
          <Plus className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <span className="text-xs font-medium text-zinc-400">Add Expense</span>
      </Link>
    </div>
  );
}
