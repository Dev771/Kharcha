'use client';

import { useGroups } from '@/hooks/use-groups';
import { ChatListItem } from '@/components/messages/chat-list-item';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react';

export default function MessagesPage() {
  const { data: groups, isLoading } = useGroups();

  if (isLoading) return <div className="p-5 md:p-6 max-w-3xl mx-auto space-y-2">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="p-5 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Messages</h1>
      {groups && groups.length > 0 ? (
        <div className="space-y-2">
          {groups.map((g: any, i: number) => <ChatListItem key={g.id} group={g} index={i} />)}
        </div>
      ) : (
        <EmptyState icon={MessageCircle} title="No conversations" description="Join or create a group to start messaging" />
      )}
    </div>
  );
}
