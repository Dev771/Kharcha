'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useSSE(token: string | undefined) {
  const queryClient = useQueryClient();

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({
            queryKey: ['notifications-unread'],
          });
          const meta = data.notification?.metadata;
          if (meta?.groupId) {
            queryClient.invalidateQueries({
              queryKey: ['balances', meta.groupId],
            });
            queryClient.invalidateQueries({
              queryKey: ['expenses', meta.groupId],
            });
            queryClient.invalidateQueries({ queryKey: ['user-summary'] });
          }
        }
      } catch {
        /* ignore */
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (!token) return;

    const es = new EventSource(`${API_URL}/events/stream?token=${token}`);
    es.onmessage = handleMessage;
    es.onerror = () => {
      /* auto-reconnects */
    };

    return () => es.close();
  }, [token, handleMessage]);
}
