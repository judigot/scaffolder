import type { QueryClient } from '@tanstack/react-query';
import { useInfraStore } from '@/useInfraStore.ts';
import { useUserStore } from '@/useUserStore.ts';

/**
 * Clears every client cache that depends on the signed-in identity
 * (query cache, user/token store, infrastructure status cache). Called on
 * sign-out and whenever the Auth0 identity changes.
 */
export const clearAuthDependentState = (queryClient: QueryClient): void => {
  void queryClient.cancelQueries();
  queryClient.clear();
  useUserStore.getState().clearUserData();
  useInfraStore.getState().clearAllStatuses();
};
