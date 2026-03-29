'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Bell, LogOut, User } from 'lucide-react';
import {
  useUnreadCount,
  useNotifications,
  useMarkAllRead,
} from '@/hooks/use-notifications';

export function Header() {
  const { data: session } = useSession();
  const [showNotifs, setShowNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: unread } = useUnreadCount();
  const { data: notifsData } = useNotifications();
  const markAll = useMarkAllRead();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const count = unread?.count ?? 0;
  const notifications = notifsData?.notifications ?? [];

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-6 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="text-sm font-medium text-zinc-400">
        {session?.user?.name
          ? `Hey, ${session.user.name.split(' ')[0]}`
          : ''}
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              const opening = !showNotifs;
              setShowNotifs(opening);
              // Auto-mark as read after opening with unread items
              if (opening && count > 0) {
                setTimeout(() => markAll.mutate(), 1500);
              }
            }}
            className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
          >
            <Bell className="w-4 h-4" />
            {count > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden anim-fade-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <span className="text-xs font-medium text-zinc-300">
                  Notifications {count > 0 && `(${count})`}
                </span>
                {count > 0 && (
                  <button
                    onClick={() => markAll.mutate()}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-8">
                    No notifications
                  </p>
                ) : (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-white/[0.04] ${!n.isRead ? 'bg-cyan-500/[0.04]' : ''}`}
                    >
                      <p className="text-xs text-zinc-300">{n.body}</p>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {new Date(n.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 flex items-center justify-center">
            <User className="w-3 h-3 text-cyan-400" />
          </div>
          <span className="hidden sm:inline">Sign out</span>
          <LogOut className="w-3 h-3 sm:hidden" />
        </button>
      </div>
    </header>
  );
}
