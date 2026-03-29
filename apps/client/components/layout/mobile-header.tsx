'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useUnreadCount } from '@/hooks/use-notifications';
import { MemberAvatar } from '@/components/ui/member-avatar';

const routeTitles: Record<string, string> = {
  '/': 'Home',
  '/groups': 'Groups',
  '/groups/new': 'New Group',
  '/activity': 'Activity',
  '/settings': 'Profile',
  '/messages': 'Messages',
};

export function MobileHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: unread } = useUnreadCount();
  const count = unread?.count ?? 0;
  const userName = session?.user?.name || 'User';
  const isHome = pathname === '/';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]">
      <div>
        {isHome ? (
          <div>
            <p className="text-xs text-[var(--text-muted)]">{greeting} 👋</p>
            <p className="text-sm font-semibold text-[var(--foreground)]">{userName.split(' ')[0]}</p>
          </div>
        ) : (
          <h1 className="text-base font-semibold text-[var(--foreground)]">{routeTitles[pathname] || 'Kharcha'}</h1>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Link href="/activity" className="relative p-2.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--subtle)] min-w-[44px] min-h-[44px] flex items-center justify-center">
          <Bell className="w-5 h-5" />
          {count > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full" />}
        </Link>
        <Link href="/settings" className="min-w-[44px] min-h-[44px] flex items-center justify-center">
          <MemberAvatar name={userName} avatarUrl={session?.user?.image} size="sm" />
        </Link>
      </div>
    </header>
  );
}
