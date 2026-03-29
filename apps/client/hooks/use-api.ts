'use client';

import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { useCallback } from 'react';

export function useApi() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const api = useCallback(
    <T>(endpoint: string, options?: Parameters<typeof apiClient>[1]) =>
      apiClient<T>(endpoint, { ...options, token }),
    [token],
  );

  return { api, token, isAuthenticated: !!token };
}
