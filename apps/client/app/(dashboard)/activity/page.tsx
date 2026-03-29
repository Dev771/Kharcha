'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, useMarkAllRead, useMarkAsRead } from '@/hooks/use-notifications';
import { EmptyState } from '@/components/ui/empty-state';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Receipt, Banknote, UserPlus, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig: Record<string, { icon: any; bg: string; color: string; tab?: string }> = {
  EXPENSE_ADDED: { icon: Receipt, bg: 'bg-brand-light', color: 'text-brand', tab: 'expenses' },
  EXPENSE_UPDATED: { icon: Receipt, bg: 'bg-brand-light', color: 'text-brand', tab: 'expenses' },
  EXPENSE_DELETED: { icon: Receipt, bg: 'bg-[var(--subtle)]', color: 'text-[var(--muted-foreground)]', tab: 'expenses' },
  SETTLEMENT_RECEIVED: { icon: Banknote, bg: 'bg-credit-bg', color: 'text-credit', tab: 'settle' },
  GROUP_INVITE: { icon: UserPlus, bg: 'bg-info-bg', color: 'text-info' },
  REMINDER: { icon: Bell, bg: 'bg-warning-bg', color: 'text-warning' },
};

type Filter = 'all' | 'unread';

export default function ActivityPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading } = useNotifications({ unreadOnly: filter === 'unread' });
  const markAll = useMarkAllRead();
  const markOne = useMarkAsRead();
  const router = useRouter();
  const notifications = data?.notifications ?? [];

  const handleClick = (n: any) => {
    // Mark as read
    if (!n.isRead) markOne.mutate(n.id);

    const groupId = n.metadata?.groupId;
    if (!groupId) return;

    const config = typeConfig[n.type];
    const tab = config?.tab;

    // Navigate to group with the appropriate tab via query param
    if (tab) {
      router.push(`/groups/${groupId}?tab=${tab}`);
    } else {
      router.push(`/groups/${groupId}`);
    }
  };

  return (
    <div className="p-5 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Activity</h1>
        {notifications.some((n: any) => !n.isRead) && (
          <Button variant="ghost" size="sm" onClick={() => markAll.mutate()}>Mark all read</Button>
        )}
      </div>

      <div className="flex gap-2">
        <Chip label="All" selected={filter === 'all'} onClick={() => setFilter('all')} />
        <Chip label="Unread" selected={filter === 'unread'} onClick={() => setFilter('unread')} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description={filter === 'unread' ? "You're all caught up!" : 'Activity will appear here when things happen in your groups'} />
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any, i: number) => {
            const t = typeConfig[n.type] || typeConfig.REMINDER;
            const Icon = t.icon;
            const groupId = n.metadata?.groupId;

            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                disabled={!groupId}
                className={cn(
                  'w-full text-left card-surface p-4 flex items-start gap-3 animate-fade-up transition-colors',
                  !n.isRead && 'border-l-2 border-l-brand',
                  groupId && 'hover:bg-[var(--hover)] cursor-pointer active:scale-[0.98]',
                  !groupId && 'cursor-default',
                )}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', t.bg)}>
                  <Icon className={cn('w-3.5 h-3.5', t.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[var(--foreground)]">{n.body}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {n.metadata?.groupName && (
                      <span className="text-[11px] text-brand font-medium">{n.metadata.groupName}</span>
                    )}
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                {!n.isRead && <span className="w-2 h-2 bg-brand rounded-full shrink-0 mt-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
