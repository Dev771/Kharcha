'use client';

import { useState } from 'react';
import {
  useNotifications,
  useMarkAllRead,
} from '@/hooks/use-notifications';
import { Receipt, Banknote, UserPlus, Bell, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const typeIcons: Record<string, { icon: any; color: string }> = {
  EXPENSE_ADDED: { icon: Receipt, color: 'text-cyan-400 bg-cyan-400/10' },
  EXPENSE_UPDATED: { icon: Receipt, color: 'text-cyan-400 bg-cyan-400/10' },
  EXPENSE_DELETED: { icon: Receipt, color: 'text-zinc-400 bg-zinc-400/10' },
  SETTLEMENT_RECEIVED: {
    icon: Banknote,
    color: 'text-emerald-400 bg-emerald-400/10',
  },
  GROUP_INVITE: {
    icon: UserPlus,
    color: 'text-violet-400 bg-violet-400/10',
  },
  REMINDER: { icon: Bell, color: 'text-amber-400 bg-amber-400/10' },
};

type Filter = 'all' | 'unread';

export default function ActivityPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading } = useNotifications({
    unreadOnly: filter === 'unread',
  });
  const markAll = useMarkAllRead();

  const notifications = data?.notifications ?? [];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Activity</h1>
        {notifications.some((n: any) => !n.isRead) && (
          <button
            onClick={() => markAll.mutate()}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.05] w-fit mb-6">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize',
              filter === f
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                : 'text-zinc-500 border border-transparent',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass p-12 text-center">
          <Bell className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">
            {filter === 'unread'
              ? 'No unread notifications'
              : 'No notifications yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any, i: number) => {
            const t = typeIcons[n.type] || typeIcons.REMINDER;
            const Icon = t.icon;
            const [iconText, iconBg] = t.color.split(' ');
            const groupId = n.metadata?.groupId;

            const card = (
              <div
                key={n.id}
                className={cn(
                  'glass p-4 flex items-start gap-3 anim-fade-up',
                  !n.isRead && 'bg-cyan-500/[0.04]',
                )}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${iconText}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-zinc-200">{n.body}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {n.metadata?.groupName && (
                      <span className="text-[11px] text-zinc-500">
                        {n.metadata.groupName}
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-600">
                      {new Date(n.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                {!n.isRead && (
                  <span className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-1.5" />
                )}
              </div>
            );

            return groupId ? (
              <Link key={n.id} href={`/groups/${groupId}`}>
                {card}
              </Link>
            ) : (
              card
            );
          })}
        </div>
      )}
    </div>
  );
}
