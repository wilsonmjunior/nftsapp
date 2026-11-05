import { QueryClient } from '@tanstack/react-query'

import { toApiError } from '@/api/errors'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx não melhora repetindo; só falhas de rede, timeout e 5xx.
      retry: (failureCount, error) => failureCount < MAX_RETRIES && toApiError(error).isTransient,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
