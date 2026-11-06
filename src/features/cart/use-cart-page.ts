import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useSyncExternalStore } from 'react'
import { toast } from 'sonner'

import { cartApi, quoteApi } from '@/api/commerce'
import type { CartItem, CartLineInput, Network, PricedLine, Quote } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { useAnnounce } from '@/components/a11y/use-announce'
import { useSession } from '@/features/session/use-session'

import { guestCart, guestLineId, parseGuestLineId, toCartLines } from './guest-cart'
import { cartQueryOptions } from './queries'
import { QUOTE_SCOPE, quoteKey } from './quote-query'
import { useCoupon } from './use-coupon'

export type CartDisplayItem = PricedLine & { id: string }

const CART_NETWORK: Network = 'ethereum'

function findPricedLine(quote: Quote | undefined, line: CartLineInput) {
  return quote?.items.find((item) => item.nftId === line.nftId && item.editionId === line.editionId)
}

/** Linha do visitante exibida enquanto a cotação ainda não trouxe nome, imagem e preço. */
function placeholderLine(line: CartLineInput): PricedLine {
  return {
    ...line,
    name: '…',
    tokenId: '',
    image: '',
    editionKind: 'open',
    editionLabel: '',
    unitPrice: '0',
    lineTotal: '0',
    available: 0,
    maxPerOrder: 0,
    nftVersion: 0,
    issues: [],
  }
}

function toDisplayItems(cartItems: CartItem[] | null, guestLines: CartLineInput[], quote: Quote | undefined): CartDisplayItem[] {
  if (cartItems) {
    return cartItems.map((item) => {
      const priced = findPricedLine(quote, item)
      return priced ? { ...priced, id: item.id, quantity: item.quantity } : item
    })
  }
  return guestLines.map((line) => ({
    ...(findPricedLine(quote, line) ?? placeholderLine(line)),
    id: guestLineId(line.nftId, line.editionId),
    quantity: line.quantity,
  }))
}

export function useCartPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const announce = useAnnounce()
  const navigate = useNavigate()
  const guestLines = useSyncExternalStore(guestCart.subscribe, guestCart.get, () => [] as CartLineInput[])
  const owner = user?.id ?? 'guest'

  const cartQuery = useQuery({
    ...cartQueryOptions(user?.id ?? ''),
    enabled: Boolean(user),
  })

  const lines = useMemo(
    () => (user ? toCartLines(cartQuery.data?.items ?? []) : guestLines),
    [user, cartQuery.data?.items, guestLines],
  )

  const { dropIfRejected, ...coupon } = useCoupon({ owner, lines, network: CART_NETWORK })
  const { appliedCoupon } = coupon

  const quoteQuery = useQuery({
    queryKey: quoteKey({ owner, lines, couponCode: appliedCoupon, network: CART_NETWORK }),
    queryFn: async ({ signal }) => {
      try {
        return await quoteApi.create(
          { items: lines, couponCode: appliedCoupon ?? undefined, network: CART_NETWORK },
          signal,
        )
      } catch (error) {
        if (appliedCoupon) dropIfRejected(error)
        throw error
      }
    },
    enabled: lines.length > 0,
    staleTime: 10_000,
    retry: false,
  })

  const items = useMemo(
    () => toDisplayItems(user ? (cartQuery.data?.items ?? null) : null, guestLines, quoteQuery.data),
    [user, cartQuery.data?.items, guestLines, quoteQuery.data],
  )

  function invalidateCartAndQuote() {
    if (user) void queryClient.invalidateQueries({ queryKey: cartQueryOptions(user.id).queryKey })
    void queryClient.invalidateQueries({ queryKey: [QUOTE_SCOPE] })
  }

  function showError(error: unknown) {
    toast.error(toApiError(error).message)
  }

  const updateMutation = useMutation({
    mutationFn: async ({ id, quantity, maxPerOrder }: { id: string; quantity: number; maxPerOrder: number; name: string }) => {
      if (!user) {
        const { nftId, editionId } = parseGuestLineId(id)
        guestCart.update(nftId, editionId, quantity, maxPerOrder)
        return
      }
      const cart = await cartApi.updateItem(id, quantity)
      queryClient.setQueryData(cartQueryOptions(user.id).queryKey, cart)
    },
    onSuccess: (_result, variables) => {
      announce(`Quantidade de ${variables.name} atualizada para ${variables.quantity}.`)
    },
    onError: showError,
    onSettled: invalidateCartAndQuote,
  })

  const removeMutation = useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      if (!user) {
        const { nftId, editionId } = parseGuestLineId(id)
        guestCart.remove(nftId, editionId)
        return
      }
      const cart = await cartApi.removeItem(id)
      queryClient.setQueryData(cartQueryOptions(user.id).queryKey, cart)
    },
    onSuccess: (_result, variables) => {
      const message = `${variables.name} removido do carrinho.`
      announce(message)
      toast.success(message)
    },
    onError: showError,
    onSettled: invalidateCartAndQuote,
  })

  function checkout() {
    if (lines.length === 0) return
    if (quoteQuery.data && !quoteQuery.data.purchasable) {
      toast.error('Resolva os itens com problema antes de finalizar.')
      return
    }
    if (!user) {
      void navigate({ to: '/login', search: { redirect: '/pagamento' } })
      return
    }
    void navigate({ to: '/pagamento' })
  }

  const isLoading = Boolean(user) && cartQuery.isPending
  const quotePending = lines.length > 0 && (quoteQuery.isPending || quoteQuery.isFetching)

  return {
    user,
    items,
    lines,
    isLoading,
    isEmpty: !isLoading && lines.length === 0,
    quote: quoteQuery.data,
    quotePending,
    quoteError: quoteQuery.error ? toApiError(quoteQuery.error) : null,
    ...coupon,
    network: CART_NETWORK,
    updateQuantity: (item: CartDisplayItem, quantity: number) =>
      updateMutation.mutate({ id: item.id, quantity, maxPerOrder: item.maxPerOrder, name: item.name }),
    removeItem: (item: CartDisplayItem) => removeMutation.mutate({ id: item.id, name: item.name }),
    isUpdating: updateMutation.isPending || removeMutation.isPending,
    checkout,
    refetch: () => {
      if (user) void cartQuery.refetch()
      void quoteQuery.refetch()
    },
  }
}
