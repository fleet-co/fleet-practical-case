import { QueryClient } from "@tanstack/react-query";

/**
 * Shared QueryClient instance used across the app.
 * staleTime of 30s avoids redundant refetches on tab switches
 * while keeping data reasonably fresh.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});
