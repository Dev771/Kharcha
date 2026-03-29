'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useSession } from 'next-auth/react';

export function useUnreadCount() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () =>
      apiClient<{ count: number }>('/notifications/unread-count', { token }),
    enabled: !!token,
    refetchInterval: 60000,
  });
}

export function useNotifications(options?: { unreadOnly?: boolean }) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: ['notifications', options?.unreadOnly],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.unreadOnly) params.set('unreadOnly', 'true');
      params.set('pageSize', '20');
      return apiClient<{ notifications: any[]; meta: any }>(
        `/notifications?${params}`,
        { token },
      );
    },
    enabled: !!token,
  });
}

export function useMarkAllRead() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient('/notifications/read-all', { method: 'POST', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}
