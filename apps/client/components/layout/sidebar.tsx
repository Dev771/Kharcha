'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Bell, Settings, Wallet, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/activity', label: 'Activity', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 bg-zinc-950/60 backdrop-blur-xl border-r border-white/5 transition-all duration-300',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-zinc-100 anim-fade-in">
            Kharcha
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-transparent text-cyan-400 border-l-2 border-cyan-400'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5',
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center p-3 mx-2 mb-4 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
      >
        <ChevronLeft
          className={cn(
            'w-4 h-4 transition-transform',
            collapsed && 'rotate-180',
          )}
        />
      </button>
    </aside>
  );
}
