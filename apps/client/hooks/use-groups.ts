'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useSession } from 'next-auth/react';

export function useGroups() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: ['groups'],
    queryFn: () => apiClient<any[]>('/groups', { token }),
    enabled: !!token,
  });
}

export function useCreateGroup() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient('/groups', { method: 'POST', body: data, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useGroupDetail(groupId: string) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => apiClient<any>(`/groups/${groupId}`, { token }),
    enabled: !!token && !!groupId,
  });
}
