'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useSession } from 'next-auth/react';

export function useSettlements(groupId: string) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: ['settlements', groupId],
    queryFn: () => apiClient<any[]>(`/groups/${groupId}/settlements`, { token }),
    enabled: !!token && !!groupId,
  });
}

export function useCreateSettlement(groupId: string) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      paidById: string;
      paidToId: string;
      amountInPaise: number;
      note?: string;
    }) =>
      apiClient(`/groups/${groupId}/settlements`, {
        method: 'POST',
        body: data,
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({
        queryKey: ['balances-simplified', groupId],
      });
      queryClient.invalidateQueries({ queryKey: ['settlements', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-summary'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
    },
  });
}

export function useSettleSplit(groupId: string) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (splitId: string) =>
      apiClient(`/groups/${groupId}/settlements/split/${splitId}`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances-simplified', groupId] });
      queryClient.invalidateQueries({ queryKey: ['settlements', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-summary'] });
    },
  });
}

export function useSettleAllBetween(groupId: string) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { fromUserId: string; toUserId: string }) =>
      apiClient(`/groups/${groupId}/settlements/settle-all`, {
        method: 'POST',
        body: data,
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances-simplified', groupId] });
      queryClient.invalidateQueries({ queryKey: ['settlements', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-summary'] });
    },
  });
}
