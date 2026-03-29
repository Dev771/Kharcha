'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';
import { useSession } from 'next-auth/react';

export function useMessages(groupId: string) {
  const { api } = useApi();

  return useInfiniteQuery({
    queryKey: ['messages', groupId],
    queryFn: ({ pageParam }) =>
      api<any>(`/groups/${groupId}/messages?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) =>
      lastPage?.meta?.hasMore ? lastPage.meta.cursor : undefined,
    enabled: !!groupId,
  });
}

export function useSendMessage(groupId: string) {
  const { api } = useApi();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      api<any>(`/groups/${groupId}/messages`, {
        method: 'POST',
        body: { content },
      }),
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ['messages', groupId] });

      const previous = queryClient.getQueryData(['messages', groupId]);

      // Optimistically add the message to the first page
      queryClient.setQueryData(['messages', groupId], (old: any) => {
        if (!old?.pages?.length) return old;

        const optimisticMsg = {
          id: `optimistic-${Date.now()}`,
          content,
          type: 'TEXT',
          createdAt: new Date().toISOString(),
          sender: {
            id: session?.user?.id,
            name: session?.user?.name || 'You',
            avatarUrl: session?.user?.image,
          },
          _optimistic: true,
        };

        const newPages = [...old.pages];
        newPages[0] = {
          ...newPages[0],
          messages: [optimisticMsg, ...(newPages[0].messages || [])],
        };

        return { ...old, pages: newPages };
      });

      return { previous };
    },
    onError: (_err, _content, context) => {
      // Roll back on error
      if (context?.previous) {
        queryClient.setQueryData(['messages', groupId], context.previous);
      }
    },
    onSettled: () => {
      // Refetch to get the real server data
      queryClient.invalidateQueries({ queryKey: ['messages', groupId] });
    },
  });
}
