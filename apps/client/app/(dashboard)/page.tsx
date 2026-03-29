'use client';

import { useUserSummary } from '@/hooks/use-balances';
import { useGroups } from '@/hooks/use-groups';
import { useNotifications } from '@/hooks/use-notifications';
import { BalanceCard } from '@/components/dashboard/balance-card';
import { OwedOwingRow } from '@/components/dashboard/owed-owing-row';
import { ActiveGroupsScroll } from '@/components/dashboard/active-groups-scroll';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard, SkeletonLine } from '@/components/ui/skeleton';
import { Users, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useUserSummary();
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const { data: notifsData } = useNotifications();
  const router = useRouter();

  const isLoading = summaryLoading || groupsLoading;

  const balanceMap = new Map(
    summary?.groups?.map((g) => [g.groupId, g.netBalanceInPaise]) ?? [],
  );

  const groupsWithBalance = (groups || []).map((g: any) => ({
    ...g,
    netBalanceInPaise: balanceMap.get(g.id) ?? 0,
  }));

  const notifications = notifsData?.notifications ?? [];

  if (isLoading) {
    return (
      <div className="p-5 md:p-6 max-w-2xl mx-auto space-y-6">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonLine className="w-24 h-5" />
        <div className="flex gap-3">
          <div className="skeleton h-32 w-48 rounded-xl shrink-0" />
          <div className="skeleton h-32 w-48 rounded-xl shrink-0" />
        </div>
      </div>
    );
  }

  const net = (summary?.totalOwedInPaise ?? 0) - (summary?.totalOwingInPaise ?? 0);

  return (
    <div className="p-5 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Balance hero */}
      <section className="animate-fade-up">
        <BalanceCard netInPaise={net} />
      </section>

      {/* Owed / Owing */}
      <section className="animate-fade-up stagger-1">
        <OwedOwingRow
          owedInPaise={summary?.totalOwedInPaise ?? 0}
          owingInPaise={summary?.totalOwingInPaise ?? 0}
        />
      </section>

      {/* Active groups */}
      <section className="animate-fade-up stagger-2">
        {groupsWithBalance.length > 0 ? (
          <ActiveGroupsScroll groups={groupsWithBalance} />
        ) : (
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Create a group to start splitting expenses"
            action={{ label: 'Create Group', onClick: () => router.push('/groups/new') }}
            compact
          />
        )}
      </section>

      {/* Recent activity */}
      <section className="animate-fade-up stagger-3">
        <RecentActivity notifications={notifications} />
      </section>
    </div>
  );
}
