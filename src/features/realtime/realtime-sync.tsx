import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { nftUpdatedEvent, orderUpdatedEvent } from '@/api/contracts'
import { useAnnounce } from '@/components/a11y/use-announce'
import { QUOTE_SCOPE } from '@/features/cart/quote-query'
import { PRIVATE_SCOPE } from '@/features/session/session-query'
import { useSession } from '@/features/session/use-session'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { sessionToken } from '@/lib/session-token'

import { applyNftUpdated } from './apply-nft-updated'
import { applyOrderUpdated } from './apply-order-updated'
import { clearSeenEvents, rememberEventId } from './seen-events'

export function RealtimeSync() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const announce = useAnnounce()
  const hadConnect = useRef(false)
  const userId = user?.id

  useEffect(() => {
    const token = sessionToken.get()
    if (!token) {
      disconnectSocket()
      clearSeenEvents()
      hadConnect.current = false
      return
    }

    const controller = new AbortController()
    let socket: Awaited<ReturnType<typeof connectSocket>> | null = null

    function authenticate() {
      socket?.emit('auth', { token: sessionToken.get() })
    }

    function onConnect() {
      authenticate()
      if (hadConnect.current) {
        void queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === PRIVATE_SCOPE ||
            query.queryKey[0] === QUOTE_SCOPE ||
            (query.queryKey[0] === 'catalog' && query.queryKey[1] === 'detail'),
        })
        announce('Conexão em tempo real restabelecida. Atualizamos carrinho e cotações.')
        toast.info('Reconectado. Dados do carrinho e pedidos foram atualizados.')
      }
      hadConnect.current = true
    }

    function onNftUpdated(payload: unknown) {
      const parsed = nftUpdatedEvent.safeParse(payload)
      if (!parsed.success) return
      if (!rememberEventId(parsed.data.eventId)) return

      const notice = applyNftUpdated(queryClient, parsed.data)
      if (!notice) return
      announce(notice.message)
      if (notice.priceChanged || notice.availabilityChanged) {
        toast.message(notice.message, { id: `nft-${notice.nftId}` })
      }
    }

    function onOrderUpdated(payload: unknown) {
      const parsed = orderUpdatedEvent.safeParse(payload)
      if (!parsed.success) return
      if (!rememberEventId(parsed.data.eventId)) return

      const notice = applyOrderUpdated(queryClient, parsed.data, userId)
      if (!notice) return
      announce(notice.message)
      if (notice.status === 'confirmed') toast.success(notice.message, { id: `order-${notice.orderId}` })
      else if (notice.status === 'declined') toast.error(notice.message, { id: `order-${notice.orderId}` })
      else toast.message(notice.message, { id: `order-${notice.orderId}` })
    }

    void connectSocket().then((client) => {
      if (controller.signal.aborted) return
      socket = client
      client.on('connect', onConnect)
      client.on('nft.updated', onNftUpdated)
      client.on('order.updated', onOrderUpdated)
      if (client.connected) {
        authenticate()
        hadConnect.current = true
      }
    })

    return () => {
      controller.abort()
      socket?.off('connect', onConnect)
      socket?.off('nft.updated', onNftUpdated)
      socket?.off('order.updated', onOrderUpdated)
    }
  }, [userId, queryClient, announce])

  useEffect(() => {
    if (!sessionToken.get()) disconnectSocket()
  }, [userId])

  return null
}
