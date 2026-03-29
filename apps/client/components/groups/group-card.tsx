'use client';

import Link from 'next/link';
import { Amount } from '@/components/ui/amount';
import { AvatarStack } from '@/components/ui/avatar-stack';
import { Users, ChevronRight } from 'lucide-react';

interface Props {
  group: { id: string; name: string; description?: string | null; imageUrl?: string | null; memberCount: number; isArchived: boolean; members?: any[] };
  netBalanceInPaise?: number;
  index?: number;
}

export function GroupCard({ group, netBalanceInPaise = 0, index = 0 }: Props) {
  const memberList = (group.members || []).map((m: any) => ({
    name: m.user?.name || 'Unknown', avatarUrl: m.user?.avatarUrl,
  }));

  return (
    <Link href={`/groups/${group.id}`} className="card-interactive p-4 flex items-center gap-4 animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
      {group.imageUrl ? (
        <img src={group.imageUrl} alt={group.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-brand" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--foreground)] truncate">{group.name}</p>
          {group.isArchived && <span className="text-[10px] px-1.5 py-0.5 bg-[var(--subtle)] text-[var(--text-muted)] rounded-md">Archived</span>}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {memberList.length > 0 && <AvatarStack members={memberList} max={3} size="xs" />}
          <span className="text-xs text-[var(--text-muted)]">{group.memberCount} members</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        {netBalanceInPaise !== 0 ? <Amount paise={netBalanceInPaise} showSign colorize size="sm" /> : <span className="text-xs text-[var(--text-muted)]">Settled</span>}
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
    </Link>
  );
}
