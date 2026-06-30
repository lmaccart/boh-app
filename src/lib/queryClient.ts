import { QueryClient } from "@tanstack/react-query";

// Single shared client. Defaults tuned for a mobile app backed by Supabase:
// data is considered fresh briefly to avoid refetch storms while navigating,
// and a couple of retries smooth over transient mobile connectivity.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
