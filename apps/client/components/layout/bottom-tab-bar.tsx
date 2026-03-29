'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Plus, Bell, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '#add', label: 'Add', icon: Plus, isCenter: true },
  { href: '/activity', label: 'Activity', icon: Bell },
  { href: '/settings', label: 'Profile', icon: User },
];

const quickActions = [
  { label: 'Add Expense', href: '/groups' },
  { label: 'Settle Up', href: '/groups' },
  { label: 'Create Group', href: '/groups/new' },
];

export function BottomTabBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [showActions, setShowActions] = useState(false);

  return (
    <>
      {showActions && (
        <div className="fixed inset-0 z-40 bg-black/35" onClick={() => setShowActions(false)}>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-2 pb-safe animate-slide-up">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href} onClick={() => setShowActions(false)}
                className="px-6 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-card text-sm font-semibold text-[var(--foreground)] text-center whitespace-nowrap active:scale-[0.98] transition-transform">
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className={cn('fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around bg-[var(--card)] border-t border-[var(--border)] pb-safe', className)}>
        {tabs.map((tab) => {
          const isActive = !tab.isCenter && (tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href));

          if (tab.isCenter) {
            return (
              <button key="add" onClick={() => setShowActions(!showActions)}
                className="relative -mt-5 w-14 h-14 rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-brand flex items-center justify-center active:scale-95 transition-transform">
                <Plus className={cn('w-6 h-6 transition-transform duration-200', showActions && 'rotate-45')} />
              </button>
            );
          }

          return (
            <Link key={tab.href} href={tab.href}
              className={cn('flex flex-col items-center gap-0.5 pt-2 pb-1 px-4 min-w-[64px] min-h-[44px] text-[10px] font-medium transition-colors',
                isActive ? 'text-brand' : 'text-[var(--text-muted)]')}>
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {isActive && <span className="w-1 h-1 bg-brand rounded-full" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
