import { queryOptions } from '@tanstack/react-query'

import { ordersApi } from '@/api/commerce'
import type { OrderStatus } from '@/api/contracts'
import { privateKey } from '@/features/session/session-query'

export { walletsQueryOptions } from '@/features/account/queries'

export const orderQueryOptions = (userId: string, orderId: string) =>
  queryOptions({
    queryKey: privateKey(userId, 'orders', orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
  })

export const ordersListQueryOptions = (userId: string, status?: OrderStatus) =>
  queryOptions({
    queryKey: privateKey(userId, 'orders', 'list', status ?? 'all'),
    queryFn: ({ signal }) => ordersApi.list(status, signal),
  })
