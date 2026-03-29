'use client';

import { ExpenseCard } from './expense-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Receipt, Loader2 } from 'lucide-react';

interface Props {
  pages: any[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  onExpenseClick: (expense: any) => void;
}

export function ExpenseList({ pages, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, onExpenseClick }: Props) {
  const expenses = pages.flatMap((p) => p.expenses || []);

  if (isLoading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>;
  }

  if (expenses.length === 0) {
    return <EmptyState icon={Receipt} title="No expenses yet" description="Add your first expense to this group" compact />;
  }

  return (
    <div className="space-y-2">
      {expenses.map((e: any, i: number) => (
        <ExpenseCard key={e.id} expense={e} onClick={() => onExpenseClick(e)} index={i} />
      ))}
      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
