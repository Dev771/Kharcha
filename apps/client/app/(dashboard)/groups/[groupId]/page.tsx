'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { useExpenses } from '@/hooks/use-expenses';
import { useGroupBalances, useSimplifiedBalances } from '@/hooks/use-balances';
import { useSettlements } from '@/hooks/use-settlements';
import { ExpenseFilters } from '@/components/expenses/expense-filters';
import { ExpenseList } from '@/components/expenses/expense-list';
import { ExpenseDetail } from '@/components/expenses/expense-detail';
import { SimplifiedView } from '@/components/balances/simplified-view';
import { DetailedView } from '@/components/balances/detailed-view';
import { SettleForm } from '@/components/settlements/settle-form';
import { SettlementList } from '@/components/settlements/settlement-list';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { AddMemberDialog } from '@/components/groups/add-member-dialog';
import { cn } from '@/lib/utils';
import { Users, ArrowLeft, Loader2, Plus, Download, UserPlus } from 'lucide-react';
import Link from 'next/link';

type Tab = 'expenses' | 'balances' | 'settle' | 'export';

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [balanceView, setBalanceView] = useState<'simplified' | 'detailed'>(
    'simplified',
  );
  const [filters, setFilters] = useState<Record<string, string | undefined>>(
    {},
  );
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState<{
    fromId: string;
    toId: string;
    amountInPaise: number;
  } | null>(null);

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => apiClient<any>(`/groups/${groupId}`, { token }),
    enabled: !!token && !!groupId,
  });

  const {
    data: expensePages,
    isLoading: expensesLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useExpenses(groupId, filters);

  const { data: rawBalances } = useGroupBalances(groupId);
  const { data: simplified } = useSimplifiedBalances(groupId);
  const { data: settlements } = useSettlements(groupId);

  const handleFilterChange = useCallback(
    (key: string, value: string | undefined) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSettle = (fromId: string, toId: string, amount: number) => {
    setSettlePrefill({ fromId, toId, amountInPaise: amount });
  };

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!group) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'expenses', label: 'Expenses' },
    { key: 'balances', label: 'Balances' },
    { key: 'settle', label: 'Settle' },
    { key: 'export', label: 'Export' },
  ];

  const handleExport = async (format: 'csv' | 'pdf') => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(
      `${API_URL}/groups/${groupId}/export?format=${format}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kharcha-${groupId.slice(0, 8)}.${format === 'pdf' ? 'txt' : 'csv'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="anim-fade-up">
        <Link
          href="/groups"
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-3 h-3" /> Back to groups
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-zinc-100">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-sm text-zinc-500 mt-0.5">
                {group.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
              <span>{group.memberCount} members</span>
              <span>&middot;</span>
              <span>{group.expenseCount} expenses</span>
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-all"
              >
                <UserPlus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 border-b border-white/[0.06] anim-fade-up"
        style={{ animationDelay: '0.05s' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'expenses' && (
        <>
          <div className="anim-fade-up" style={{ animationDelay: '0.1s' }}>
            <ExpenseFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
          <div className="anim-fade-up" style={{ animationDelay: '0.15s' }}>
            <ExpenseList
              pages={expensePages?.pages || []}
              isLoading={expensesLoading}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              fetchNextPage={fetchNextPage}
              onExpenseClick={setSelectedExpense}
            />
          </div>
        </>
      )}

      {activeTab === 'balances' && (
        <div className="space-y-4 anim-fade-up" style={{ animationDelay: '0.1s' }}>
          {/* Toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.05] w-fit">
            {(['simplified', 'detailed'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setBalanceView(v)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  balanceView === v
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                    : 'text-zinc-500 border border-transparent',
                )}
              >
                {v === 'simplified' ? 'Simplified' : 'Detailed'}
              </button>
            ))}
          </div>

          {balanceView === 'simplified' && simplified ? (
            <SimplifiedView data={simplified} onSettle={handleSettle} />
          ) : rawBalances ? (
            <DetailedView balances={rawBalances.balances || []} />
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            </div>
          )}
        </div>
      )}

      {activeTab === 'settle' && (
        <div className="space-y-6 anim-fade-up" style={{ animationDelay: '0.1s' }}>
          {/* Suggested payments */}
          {simplified && (
            <SimplifiedView data={simplified} onSettle={handleSettle} />
          )}

          {/* Settlement history */}
          <div>
            <h3 className="text-sm font-medium text-zinc-300 mb-3">
              Settlement History
            </h3>
            <SettlementList settlements={settlements || []} />
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="space-y-4 anim-fade-up" style={{ animationDelay: '0.1s' }}>
          <p className="text-sm text-zinc-400">
            Download expense data for this group.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleExport('csv')}
              className="glass p-6 text-center hover:border-cyan-500/20 transition-all"
            >
              <Download className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-200">CSV</p>
              <p className="text-xs text-zinc-500 mt-1">For spreadsheets</p>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="glass p-6 text-center hover:border-teal-500/20 transition-all"
            >
              <Download className="w-6 h-6 text-teal-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-200">Report</p>
              <p className="text-xs text-zinc-500 mt-1">Text report</p>
            </button>
          </div>
        </div>
      )}

      {/* Expense detail sheet */}
      {selectedExpense && (
        <ExpenseDetail
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
        />
      )}

      {/* Settle form sheet */}
      {settlePrefill && (
        <SettleForm
          groupId={groupId}
          members={group.members || []}
          prefill={settlePrefill}
          onClose={() => setSettlePrefill(null)}
        />
      )}

      {/* Add Expense form */}
      {showExpenseForm && (
        <ExpenseForm
          groupId={groupId}
          members={group.members || []}
          currentUserId={session?.user?.id || ''}
          onClose={() => setShowExpenseForm(false)}
        />
      )}

      {/* Add member dialog */}
      {showAddMember && (
        <AddMemberDialog
          groupId={groupId}
          inviteCode={group.inviteCode}
          onClose={() => setShowAddMember(false)}
        />
      )}

      {/* Floating action button */}
      <button
        onClick={() => setShowExpenseForm(true)}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 rounded-full btn-primary flex items-center justify-center shadow-xl shadow-cyan-500/30 z-40"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
