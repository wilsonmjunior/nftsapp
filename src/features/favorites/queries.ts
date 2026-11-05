import { queryOptions } from '@tanstack/react-query'

import { favoritesApi } from '@/api/commerce'
import { privateKey } from '@/features/session/session-query'

export const favoritesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: privateKey(userId, 'favorites'),
    queryFn: ({ signal }) => favoritesApi.list(signal),
  })
