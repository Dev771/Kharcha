'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useSession } from 'next-auth/react';

export function useUserSummary() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: ['user-summary'],
    queryFn: () =>
      apiClient<{
        totalOwedInPaise: number;
        totalOwingInPaise: number;
        groups: {
          groupId: string;
          groupName: string;
          netBalanceInPaise: number;
        }[];
      }>('/users/me/summary', { token }),
    enabled: !!token,
  });
}

export function useGroupBalances(groupId: string) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => apiClient<any>(`/groups/${groupId}/balances`, { token }),
    enabled: !!token && !!groupId,
  });
}

export function useSimplifiedBalances(groupId: string) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: ['balances-simplified', groupId],
    queryFn: () =>
      apiClient<any>(`/groups/${groupId}/balances/simplified`, { token }),
    enabled: !!token && !!groupId,
  });
}
