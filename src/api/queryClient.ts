import { QueryClient } from '@tanstack/react-query';

/**
 * React Query client configuration
 * Optimized for offline-first mobile usage
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes stale time
      gcTime: 30 * 60 * 1000, // 30 minutes garbage collection (formerly cacheTime)
      retry: 2,
      refetchOnReconnect: true, // Re-fetch when back online
      refetchOnWindowFocus: false, // Not applicable for mobile
      networkMode: 'offlineFirst', // Use cache first
    },
    mutations: {
      networkMode: 'offlineFirst', // Queue mutations offline
      retry: 3,
    },
  },
});

export default queryClient;
