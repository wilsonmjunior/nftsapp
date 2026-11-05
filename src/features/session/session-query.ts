import { queryOptions, type QueryClient } from '@tanstack/react-query'

import { authApi } from '@/api/auth'
import type { AuthResponse, Session } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { sessionToken } from '@/lib/session-token'

import { expiredNotice } from './expired-notice'

export const SESSION_KEY = ['session'] as const

/** Raiz de toda query com dado do usuário. Sempre `[PRIVATE_SCOPE, userId, ...]`. */
export const PRIVATE_SCOPE = 'me'

export function privateKey(userId: string, ...parts: unknown[]) {
  return [PRIVATE_SCOPE, userId, ...parts] as const
}

export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: SESSION_KEY,
    queryFn: async ({ signal }): Promise<Session | null> => {
      if (!sessionToken.get()) return null
      try {
        return await authApi.session(signal)
      } catch (error) {
        const apiError = toApiError(error)
        if (!apiError.isUnauthorized) throw apiError
        sessionToken.set(null)
        return null
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
  })

export function establishSession(queryClient: QueryClient, { session, token }: AuthResponse) {
  const previous = queryClient.getQueryData<Session | null>(SESSION_KEY)
  if (previous && previous.user.id !== session.user.id) {
    queryClient.removeQueries({ queryKey: [PRIVATE_SCOPE] })
  }

  sessionToken.set(token)
  queryClient.setQueryData(SESSION_KEY, session)
  expiredNotice.set(false)
  void connectSocket()
  // Respostas públicas podem ter sido obtidas sem sessão (ex.: preço com cupom do usuário).
  void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== SESSION_KEY[0] })
  // Carrinho do visitante entra no do usuário; falha fica para a etapa do carrinho retentar.
  void import('@/features/cart/use-cart').then(({ mergeGuestCart }) => mergeGuestCart(queryClient, session.user.id))
}

export function clearSession(queryClient: QueryClient) {
  sessionToken.set(null)
  disconnectSocket()
  queryClient.setQueryData(SESSION_KEY, null)
  queryClient.removeQueries({ queryKey: [PRIVATE_SCOPE] })
}
