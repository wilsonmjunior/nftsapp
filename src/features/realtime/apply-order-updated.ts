import type { QueryClient } from '@tanstack/react-query'

import type { Order, OrderUpdatedEvent } from '@/api/contracts'
import { PRIVATE_SCOPE, privateKey } from '@/features/session/session-query'

const TERMINAL: ReadonlySet<Order['status']> = new Set(['confirmed', 'declined'])

function canApply(current: Order | undefined, event: OrderUpdatedEvent) {
  if (!current) return true
  if (current.version >= event.version) return false
  // Estado terminal não regride (ex.: confirmed → pending).
  if (TERMINAL.has(current.status) && current.status !== event.data.status) return false
  return true
}

export function applyOrderUpdated(
  queryClient: QueryClient,
  event: OrderUpdatedEvent,
  currentUserId: string | undefined,
) {
  if (!currentUserId || event.userId !== currentUserId) return null

  const orderId = event.resource.id
  let applied = false

  queryClient.setQueryData<Order>(privateKey(currentUserId, 'orders', orderId), (current) => {
    if (!canApply(current, event)) return current
    applied = true
    if (!current) {
      // Pedido ainda não está no cache: invalida a lista e o detalhe para o REST preencher.
      return current
    }
    return {
      ...current,
      version: event.version,
      status: event.data.status,
      transaction: event.data.transaction,
      declineReason: event.data.declineReason,
      updatedAt: event.occurredAt,
    }
  })

  void queryClient.invalidateQueries({ queryKey: privateKey(currentUserId, 'orders') })
  void queryClient.invalidateQueries({ queryKey: privateKey(currentUserId, 'cart') })

  if (!applied) {
    // Sem cache local: ainda reconcilia via REST.
    void queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === PRIVATE_SCOPE &&
        query.queryKey[1] === currentUserId &&
        query.queryKey[2] === 'orders',
    })
  }

  return {
    orderId,
    status: event.data.status,
    message:
      event.data.status === 'confirmed'
        ? 'Pedido confirmado.'
        : event.data.status === 'declined'
          ? event.data.declineReason ?? 'Pedido recusado.'
          : 'Pedido atualizado.',
  }
}
