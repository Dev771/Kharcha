'use client';

import { useUserSummary } from '@/hooks/use-balances';
import { useGroups } from '@/hooks/use-groups';
import { BalanceBento } from '@/components/balances/balance-bento';
import { GroupCard } from '@/components/groups/group-card';
import { Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useUserSummary();
  const { data: groups, isLoading: groupsLoading } = useGroups();

  if (summaryLoading || groupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Build a map of groupId → netBalance from summary
  const balanceMap = new Map(
    summary?.groups?.map((g) => [g.groupId, g.netBalanceInPaise]) ?? [],
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      {/* Balance Bento Grid */}
      <section className="anim-fade-up">
        <BalanceBento
          totalOwedInPaise={summary?.totalOwedInPaise ?? 0}
          totalOwingInPaise={summary?.totalOwingInPaise ?? 0}
        />
      </section>

      {/* Groups */}
      <section className="anim-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Your Groups</h2>
          <Link href="/groups/new" className="btn-primary px-4 py-2 flex items-center gap-2 text-xs inline-flex">
            <Plus className="w-3 h-3" />
            New Group
          </Link>
        </div>

        {groups && groups.length > 0 ? (
          <div className="space-y-2">
            {groups.map((group: any, i: number) => (
              <GroupCard
                key={group.id}
                group={group}
                netBalanceInPaise={balanceMap.get(group.id) ?? 0}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div className="glass p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400 mb-1">No groups yet</p>
            <p className="text-xs text-zinc-600">
              Create your first group to start splitting expenses
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
