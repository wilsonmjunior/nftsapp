import { queryOptions } from '@tanstack/react-query'

import { cartApi } from '@/api/commerce'
import { privateKey } from '@/features/session/session-query'

export const cartQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: privateKey(userId, 'cart'),
    queryFn: ({ signal }) => cartApi.get(signal),
  })
