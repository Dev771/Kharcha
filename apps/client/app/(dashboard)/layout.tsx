'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSSE } from '@/hooks/use-sse';
import { Sidebar } from '@/components/layout/sidebar';
import { DesktopHeader } from '@/components/layout/desktop-header';
import { MobileHeader } from '@/components/layout/mobile-header';
import { BottomTabBar } from '@/components/layout/bottom-tab-bar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useSSE(token);

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <div className="hidden md:block"><DesktopHeader /></div>
        <div className="md:hidden"><MobileHeader /></div>

        <main className="flex-1 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <BottomTabBar className="md:hidden" />
    </div>
  );
}
