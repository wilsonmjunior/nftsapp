import { queryOptions } from '@tanstack/react-query'

import { accountApi } from '@/api/account'
import { privateKey } from '@/features/session/session-query'

export const profileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: privateKey(userId, 'profile'),
    queryFn: ({ signal }) => accountApi.profile(signal),
  })

export const walletsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: privateKey(userId, 'wallets'),
    queryFn: ({ signal }) => accountApi.wallets(signal),
  })
