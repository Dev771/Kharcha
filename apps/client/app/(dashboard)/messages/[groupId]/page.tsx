'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { GroupChat } from '@/components/groups/group-chat';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GroupChatPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => apiClient<any>(`/groups/${groupId}`, { token }),
    enabled: !!token && !!groupId,
  });

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]">
        <Link href="/messages" className="min-w-[44px] min-h-[44px] flex items-center justify-center md:hidden">
          <ArrowLeft className="w-5 h-5 text-[var(--muted-foreground)]" />
        </Link>
        {group && <MemberAvatar name={group.name} size="sm" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)] truncate">{group?.name || 'Chat'}</p>
          <p className="text-[11px] text-[var(--text-muted)]">{group?.memberCount || 0} members</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <GroupChat groupId={groupId} />
      </div>
    </div>
  );
}
