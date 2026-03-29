'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Bell, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/activity', label: 'Activity', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 bg-zinc-950/90 backdrop-blur-xl border-t border-white/5">
      {tabs.map((tab) => {
        const isActive =
          tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-4 text-[10px] font-medium transition-all',
              isActive ? 'text-cyan-400' : 'text-zinc-600',
            )}
          >
            <tab.icon className="w-5 h-5" />
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-1.5 w-1 h-1 bg-cyan-400 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
