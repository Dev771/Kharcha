'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useSession } from 'next-auth/react';

export function useExpenses(
  groupId: string,
  filters: Record<string, string | undefined> = {},
) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useInfiniteQuery({
    queryKey: ['expenses', groupId, filters],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.search) params.set('search', filters.search);
      if (filters.paidBy) params.set('paidBy', filters.paidBy);
      if (pageParam) params.set('cursor', pageParam);
      params.set('pageSize', '10');

      return apiClient<any>(
        `/groups/${groupId}/expenses?${params.toString()}`,
        { token },
      );
    },
    getNextPageParam: (lastPage: any) =>
      lastPage?.meta?.hasMore ? lastPage.meta.cursor : undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!token && !!groupId,
  });
}

export function useCreateExpense(groupId: string) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      amountInPaise: number;
      description: string;
      splitType: string;
      date: string;
      paidById: string;
      splits: { userId: string; value?: number }[];
      category?: string;
      currency?: string;
    }) =>
      apiClient(`/groups/${groupId}/expenses`, {
        method: 'POST',
        body: data,
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({
        queryKey: ['balances-simplified', groupId],
      });
      queryClient.invalidateQueries({ queryKey: ['user-summary'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
}

export function useUpdateExpense(groupId: string) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, data }: { expenseId: string; data: any }) =>
      apiClient(`/groups/${groupId}/expenses/${expenseId}`, {
        method: 'PATCH',
        body: data,
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances-simplified', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-summary'] });
    },
  });
}

export function useDeleteExpense(groupId: string) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) =>
      apiClient(`/groups/${groupId}/expenses/${expenseId}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances-simplified', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-summary'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
}
