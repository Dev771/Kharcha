'use client';

import { useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { useExpenses } from '@/hooks/use-expenses';
import { useGroupBalances, useSimplifiedBalances } from '@/hooks/use-balances';
import { useSettlements } from '@/hooks/use-settlements';
import { ExpenseFilters } from '@/components/groups/expense-filters';
import { ExpenseList } from '@/components/groups/expense-list';
import { ExpenseDetailSheet } from '@/components/groups/expense-detail-sheet';
import { SimplifiedView, DetailedView } from '@/components/groups/balance-views';
import { SettleForm } from '@/components/groups/settle-form';
import { AddExpenseSheet } from '@/components/expenses/add-expense-sheet';
import { SettlementList } from '@/components/groups/settlement-list';
import { AddMemberDialog } from '@/components/groups/add-member-dialog';
import { GroupChat } from '@/components/groups/group-chat';
import { GroupSettingsSheet } from '@/components/groups/group-settings-sheet';
import { AvatarStack } from '@/components/ui/avatar-stack';
import { Chip } from '@/components/ui/chip';
import { Amount } from '@/components/ui/amount';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Button } from '@/components/ui/button';
import { SkeletonCard, SkeletonLine } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Users, ArrowLeft, Plus, UserPlus, Settings, Loader2 } from 'lucide-react';
import Link from 'next/link';

type Tab = 'expenses' | 'balances' | 'settle' | 'chat';

const tabItems: { key: Tab; label: string }[] = [
  { key: 'expenses', label: 'Expenses' },
  { key: 'balances', label: 'Balances' },
  { key: 'settle', label: 'Settle' },
  { key: 'chat', label: 'Chat' },
];

export default function GroupDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = params.groupId as string;
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const initialTab = (searchParams.get('tab') as Tab) || 'expenses';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [balanceView, setBalanceView] = useState<'simplified' | 'detailed'>('simplified');
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState<{ fromId: string; toId: string; amountInPaise: number } | null>(null);

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => apiClient<any>(`/groups/${groupId}`, { token }),
    enabled: !!token && !!groupId,
  });

  const { data: expensePages, isLoading: expensesLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useExpenses(groupId, filters);
  const { data: rawBalances } = useGroupBalances(groupId);
  const { data: simplified } = useSimplifiedBalances(groupId);
  const { data: settlements } = useSettlements(groupId);

  const handleFilterChange = useCallback((key: string, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSettle = (fromId: string, toId: string, amount: number) => {
    setSettlePrefill({ fromId, toId, amountInPaise: amount });
  };

  if (groupLoading) {
    return (
      <div className="px-4 py-5 md:p-6 max-w-3xl mx-auto space-y-4">
        <SkeletonLine className="w-20 h-4" />
        <SkeletonCard />
        <div className="grid grid-cols-2 gap-3"><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  if (!group) return null;

  const members = group.members || [];
  const memberList = members.map((m: any) => ({ name: m.user?.name || 'Unknown', avatarUrl: m.user?.avatarUrl }));
  const myBalance = rawBalances?.balances?.find((b: any) => b.userId === session?.user?.id)?.netInPaise ?? 0;
  const settlementPct = simplified ? Math.round((simplified.simplifiedTransactionCount / Math.max(simplified.originalTransactionCount, 1)) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto overflow-x-hidden">
      {/* Header — contained padding */}
      <div className="px-4 pt-4 pb-2 md:px-6 md:pt-6 animate-fade-up">
        <Link href="/groups" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] inline-flex items-center gap-1 mb-3 min-h-[44px]">
          <ArrowLeft className="w-3 h-3" /> Groups
        </Link>

        <div className="flex items-start gap-3">
          {group.imageUrl ? (
            <img src={group.imageUrl} alt={group.name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-brand" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-[var(--foreground)] truncate">{group.name}</h1>
            {group.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{group.description}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setShowAddMember(true)} className="p-2 rounded-lg text-brand hover:bg-brand-light min-w-[44px] min-h-[44px] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--subtle)] min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Members row — separate line */}
        <div className="flex items-center gap-2 mt-3">
          <AvatarStack members={memberList} max={4} size="xs" />
          <span className="text-xs text-[var(--text-muted)]">{group.memberCount} members</span>
        </div>
      </div>

      {/* Stats — 2 col on mobile, 3 col on desktop */}
      <div className="px-4 md:px-6 mt-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div className="card-surface p-3 text-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Balance</p>
            <Amount paise={myBalance} showSign colorize size="base" className="font-bold" />
          </div>
          <div className="card-surface p-3 text-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Expenses</p>
            <p className="text-base font-bold text-[var(--foreground)] tabular-nums">{group.expenseCount || 0}</p>
          </div>
          <div className="card-surface p-3 hidden md:flex flex-col items-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Settled</p>
            <ProgressRing value={100 - settlementPct} size={28} strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Tabs — full bleed horizontal scroll */}
      <div className="mt-4 border-b border-[var(--border)]">
        <div className="flex overflow-x-auto scrollbar-hide px-4 md:px-6">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap min-h-[44px] border-b-2 transition-colors shrink-0',
                activeTab === tab.key
                  ? 'text-[var(--primary)] border-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] border-transparent',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — with padding */}
      <div className="px-4 md:px-6 py-4">
        {activeTab === 'expenses' && (
          <div className="space-y-4 animate-fade-in">
            <ExpenseFilters filters={filters} onFilterChange={handleFilterChange} />
            <ExpenseList pages={expensePages?.pages || []} isLoading={expensesLoading}
              isFetchingNextPage={isFetchingNextPage} hasNextPage={!!hasNextPage}
              fetchNextPage={fetchNextPage} onExpenseClick={setSelectedExpense} />
            {/* Mobile add expense button */}
            <div className="md:hidden">
              <Button variant="primary" size="lg" className="w-full" onClick={() => setShowExpenseForm(true)}>
                <Plus className="w-4 h-4" /> Add Expense
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'balances' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex gap-2">
              <Chip label="Simplified" selected={balanceView === 'simplified'} onClick={() => setBalanceView('simplified')} />
              <Chip label="Detailed" selected={balanceView === 'detailed'} onClick={() => setBalanceView('detailed')} />
            </div>
            {balanceView === 'simplified' && simplified ? (
              <SimplifiedView data={simplified} onSettle={handleSettle} />
            ) : rawBalances ? (
              <DetailedView balances={rawBalances.balances || []} />
            ) : (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-brand animate-spin" /></div>
            )}
          </div>
        )}

        {activeTab === 'settle' && (
          <div className="space-y-6 animate-fade-in">
            {simplified && <SimplifiedView data={simplified} onSettle={handleSettle} />}
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Settlement History</h3>
              <SettlementList settlements={settlements || []} />
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="animate-fade-in -mx-4 md:mx-0">
            <GroupChat groupId={groupId} />
          </div>
        )}
      </div>

      {/* Sheets */}
      <ExpenseDetailSheet expense={selectedExpense} onClose={() => setSelectedExpense(null)} />
      {settlePrefill && <SettleForm groupId={groupId} members={members} prefill={settlePrefill} onClose={() => setSettlePrefill(null)} />}
      {showAddMember && <AddMemberDialog groupId={groupId} inviteCode={group.inviteCode} onClose={() => setShowAddMember(false)} />}
      <AddExpenseSheet open={showExpenseForm} onClose={() => setShowExpenseForm(false)} groupId={groupId} members={members} currentUserId={session?.user?.id || ''} />
      <GroupSettingsSheet open={showSettings} onClose={() => setShowSettings(false)} group={group} />

      {/* FAB — desktop only */}
      <button onClick={() => setShowExpenseForm(true)} className="fab hidden md:flex">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
