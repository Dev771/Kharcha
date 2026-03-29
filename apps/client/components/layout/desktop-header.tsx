'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bell, Receipt, Banknote, UserPlus } from 'lucide-react';
import { useUnreadCount, useNotifications, useMarkAllRead, useMarkAsRead } from '@/hooks/use-notifications';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const typeTab: Record<string, string | undefined> = {
  EXPENSE_ADDED: 'expenses',
  EXPENSE_UPDATED: 'expenses',
  EXPENSE_DELETED: 'expenses',
  SETTLEMENT_RECEIVED: 'settle',
};

const typeIcon: Record<string, any> = {
  EXPENSE_ADDED: Receipt,
  EXPENSE_UPDATED: Receipt,
  EXPENSE_DELETED: Receipt,
  SETTLEMENT_RECEIVED: Banknote,
  GROUP_INVITE: UserPlus,
};

export function DesktopHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showNotifs, setShowNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: unread } = useUnreadCount();
  const { data: notifsData } = useNotifications();
  const markAll = useMarkAllRead();
  const markOne = useMarkAsRead();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const count = unread?.count ?? 0;
  const notifications = notifsData?.notifications ?? [];
  const userName = session?.user?.name || 'User';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const handleNotifClick = (n: any) => {
    if (!n.isRead) markOne.mutate(n.id);
    setShowNotifs(false);

    const groupId = n.metadata?.groupId;
    if (!groupId) return;

    const tab = typeTab[n.type];
    router.push(tab ? `/groups/${groupId}?tab=${tab}` : `/groups/${groupId}`);
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-6 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-md">
      <div className="text-sm text-[var(--muted-foreground)]">
        {greeting}, <span className="font-semibold text-[var(--foreground)]">{userName.split(' ')[0]}</span> 👋
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--subtle)] min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Bell className="w-5 h-5" />
            {count > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full" />}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 card-elevated overflow-hidden animate-fade-up z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="text-xs font-medium text-[var(--foreground)]">Notifications {count > 0 && `(${count})`}</span>
                <div className="flex items-center gap-3">
                  {count > 0 && <button onClick={() => markAll.mutate()} className="text-[10px] text-brand hover:text-brand-dark font-medium">Mark all read</button>}
                  <Link href="/activity" onClick={() => setShowNotifs(false)} className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">View all</Link>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-8">No notifications</p>
                ) : notifications.slice(0, 8).map((n: any) => {
                  const groupId = n.metadata?.groupId;
                  const Icon = typeIcon[n.type] || Bell;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={cn(
                        'w-full text-left px-4 py-3 border-b border-[var(--border-light)] flex items-start gap-3 transition-colors',
                        'hover:bg-[var(--hover)] active:bg-[var(--subtle)]',
                        !n.isRead && 'bg-brand-50',
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 text-[var(--muted-foreground)] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[var(--foreground)]">{n.body}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {n.metadata?.groupName && <span className="text-[10px] text-brand font-medium">{n.metadata.groupName}</span>}
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      {!n.isRead && <span className="w-1.5 h-1.5 bg-brand rounded-full shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <Link href="/settings" className="min-w-[44px] min-h-[44px] flex items-center justify-center">
          <MemberAvatar name={userName} avatarUrl={session?.user?.image} size="sm" />
        </Link>
      </div>
    </header>
  );
}
