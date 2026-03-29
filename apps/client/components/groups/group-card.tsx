'use client';

import Link from 'next/link';
import { formatCurrency } from '@kharcha/shared';
import { Users, ChevronRight } from 'lucide-react';

interface Props {
  group: {
    id: string;
    name: string;
    description?: string | null;
    memberCount: number;
    isArchived: boolean;
  };
  netBalanceInPaise?: number;
  index?: number;
}

export function GroupCard({ group, netBalanceInPaise = 0, index = 0 }: Props) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="glass p-4 flex items-center gap-4 group transition-all hover:-translate-y-0.5 anim-fade-up"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 flex items-center justify-center flex-shrink-0">
        <Users className="w-4 h-4 text-cyan-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-200 truncate">
            {group.name}
          </p>
          {group.isArchived && (
            <span className="px-1.5 py-0.5 text-[10px] bg-zinc-800 text-zinc-500 rounded-md">
              Archived
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Balance */}
      <div className="text-right flex-shrink-0">
        <p
          className={`text-sm font-semibold ${netBalanceInPaise > 0 ? 'text-emerald-400' : netBalanceInPaise < 0 ? 'text-rose-400' : 'text-zinc-500'}`}
        >
          {netBalanceInPaise !== 0
            ? `${netBalanceInPaise > 0 ? '+' : ''}${formatCurrency(Math.abs(netBalanceInPaise))}`
            : 'Settled'}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
}
