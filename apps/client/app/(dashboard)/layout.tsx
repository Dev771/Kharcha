'use client';

import { useSession } from 'next-auth/react';
import { useSSE } from '@/hooks/use-sse';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  // Connect to SSE for real-time notifications
  useSSE(token);

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 relative pb-20 md:pb-0">
          {/* Ambient gradient orbs */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
            <div className="absolute top-1/3 -left-20 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/[0.03] rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
