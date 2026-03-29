'use client';

import Link from 'next/link';
import { Amount } from '@/components/ui/amount';
import { AvatarStack } from '@/components/ui/avatar-stack';
import { Users } from 'lucide-react';

interface GroupItem {
  id: string;
  name: string;
  memberCount: number;
  members?: { user?: { name: string; avatarUrl?: string | null } }[];
  netBalanceInPaise?: number;
}

export function ActiveGroupsScroll({ groups }: { groups: GroupItem[] }) {
  if (groups.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Active Bills</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5">
        {groups.map((g) => {
          const memberList = (g.members || []).map((m) => ({
            name: m.user?.name || 'Unknown',
            avatarUrl: m.user?.avatarUrl,
          }));
          return (
            <Link key={g.id} href={`/groups/${g.id}`}
              className="card-interactive p-4 min-w-[200px] shrink-0 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center">
                  <Users className="w-4 h-4 text-brand" />
                </div>
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{g.name}</p>
              </div>
              <div className="flex items-center justify-between">
                {memberList.length > 0 && <AvatarStack members={memberList} max={3} size="xs" />}
                <span className="text-[10px] text-[var(--text-muted)]">{g.memberCount} members</span>
              </div>
              {g.netBalanceInPaise !== undefined && g.netBalanceInPaise !== 0 && (
                <Amount paise={g.netBalanceInPaise} showSign colorize size="sm" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
