'use client';

import Link from 'next/link';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { ChevronRight } from 'lucide-react';

interface Props {
  group: { id: string; name: string; memberCount: number };
  index?: number;
}

export function ChatListItem({ group, index = 0 }: Props) {
  return (
    <Link href={`/messages/${group.id}`}
      className="card-interactive p-4 flex items-center gap-3 animate-fade-up"
      style={{ animationDelay: `${index * 0.04}s` }}>
      <MemberAvatar name={group.name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)] truncate">{group.name}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">{group.memberCount} members · Tap to chat</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
    </Link>
  );
}
