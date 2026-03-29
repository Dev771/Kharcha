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

export function useMarkAsRead() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient(`/notifications/${notificationId}/read`, { method: 'PATCH', token }),
    onMutate: async (notificationId) => {
      // Optimistically mark as read in cache
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old?.notifications) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: any) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
          ),
        };
      });

      // Optimistically decrement unread count
      queryClient.setQueryData(['notifications-unread'], (old: any) => {
        if (!old) return old;
        return { count: Math.max(0, (old.count || 0) - 1) };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useMarkAllRead() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient('/notifications/read-all', { method: 'POST', token }),
    onMutate: async () => {
      // Optimistically mark all as read
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old?.notifications) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: any) => ({ ...n, isRead: true })),
        };
      });

      queryClient.setQueryData(['notifications-unread'], { count: 0 });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}
