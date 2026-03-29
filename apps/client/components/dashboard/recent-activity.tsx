'use client';

import { Receipt, Banknote, UserPlus, Bell } from 'lucide-react';
import Link from 'next/link';

const typeConfig: Record<string, { icon: any; bg: string; color: string }> = {
  EXPENSE_ADDED: { icon: Receipt, bg: 'bg-brand-light', color: 'text-brand' },
  EXPENSE_UPDATED: { icon: Receipt, bg: 'bg-brand-light', color: 'text-brand' },
  SETTLEMENT_RECEIVED: { icon: Banknote, bg: 'bg-credit-bg', color: 'text-credit' },
  GROUP_INVITE: { icon: UserPlus, bg: 'bg-info-bg', color: 'text-info' },
  REMINDER: { icon: Bell, bg: 'bg-warning-bg', color: 'text-warning' },
};

export function RecentActivity({ notifications }: { notifications: any[] }) {
  if (notifications.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent Activity</h2>
        <Link href="/activity" className="text-xs text-brand font-medium">View all</Link>
      </div>
      <div className="card-surface divide-y divide-[var(--border-light)]">
        {notifications.slice(0, 5).map((n: any, i: number) => {
          const t = typeConfig[n.type] || typeConfig.REMINDER;
          const Icon = t.icon;
          return (
            <div key={n.id} className="flex items-center gap-3 px-4 py-3 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className={`w-8 h-8 rounded-full ${t.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${t.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--foreground)] truncate">{n.body}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
