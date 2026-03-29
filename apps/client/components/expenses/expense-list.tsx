'use client';

import { ExpenseCard } from './expense-card';
import { Loader2, SearchX } from 'lucide-react';

interface Props {
  pages: any[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  onExpenseClick?: (expense: any) => void;
}

export function ExpenseList({
  pages,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  onExpenseClick,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="glass p-4 h-16 animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    );
  }

  const allExpenses = pages.flatMap((p) => p.expenses || []);

  if (allExpenses.length === 0) {
    return (
      <div className="glass p-12 text-center">
        <SearchX className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-400">No expenses match your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allExpenses.map((expense: any, i: number) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          onClick={() => onExpenseClick?.(expense)}
          index={i}
        />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-3 rounded-xl btn-ghost text-xs flex items-center justify-center gap-2"
        >
          {isFetchingNextPage ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            'Load more'
          )}
        </button>
      )}
    </div>
  );
}
