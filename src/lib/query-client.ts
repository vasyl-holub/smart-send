import { QueryClient } from '@tanstack/react-query'
import { NetworkError } from '@/api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Only network blips are retried: HTTP and contract errors are final, 401/419 are handled by the client.
      retry: (failureCount, error) => error instanceof NetworkError && failureCount < 2,
    },
  },
})
