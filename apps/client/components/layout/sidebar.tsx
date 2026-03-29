'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Users, MessageCircle, Bell, Settings, Wallet, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MemberAvatar } from '@/components/ui/member-avatar';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/activity', label: 'Activity', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || 'User';

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col shrink-0 h-screen sticky top-0 bg-[var(--card)] border-r border-[var(--border)] transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center shadow-brand shrink-0">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          {!collapsed && <span className="text-lg font-bold text-[var(--foreground)] truncate">Kharcha</span>}
        </div>
        <button onClick={onToggle} className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition-all shrink-0">
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]',
                isActive
                  ? 'bg-brand-light text-brand'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)]',
                collapsed && 'justify-center px-0',
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {!collapsed && (
        <div className="px-3 py-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 px-2">
            <MemberAvatar name={userName} avatarUrl={session?.user?.image} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)] truncate">{userName}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{session?.user?.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
