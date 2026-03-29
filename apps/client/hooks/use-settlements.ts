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
    },
  });
}
