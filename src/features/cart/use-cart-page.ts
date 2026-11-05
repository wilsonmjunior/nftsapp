import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'

import { cartApi, quoteApi } from '@/api/commerce'
import type { CartItem, CartLineInput, Network, PricedLine, Quote } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { useAnnounce } from '@/components/a11y/use-announce'
import { useSession } from '@/features/session/use-session'

import { couponStorage } from './coupon-storage'
import { guestCart, guestLineId, parseGuestLineId } from './guest-cart'
import { cartQueryOptions } from './queries'

export type CartDisplayItem = PricedLine & { id: string }

function toLines(items: Array<{ nftId: string; editionId: string; quantity: number }>): CartLineInput[] {
  return items.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity }))
}

function mergeDisplay(cartItems: CartItem[] | null, guestLines: CartLineInput[], quote: Quote | undefined): CartDisplayItem[] {
  if (cartItems) {
    return cartItems.map((item) => {
      const priced = quote?.items.find((line) => line.nftId === item.nftId && line.editionId === item.editionId)
      return priced ? { ...priced, id: item.id, quantity: item.quantity } : item
    })
  }
  return guestLines.map((line) => {
    const priced = quote?.items.find((item) => item.nftId === line.nftId && item.editionId === line.editionId)
    return {
      ...(priced ?? {
        ...line,
        name: '…',
        tokenId: '',
        image: '',
        editionKind: 'open' as const,
        editionLabel: '',
        unitPrice: '0',
        lineTotal: '0',
        available: 0,
        maxPerOrder: 0,
        nftVersion: 0,
        issues: [],
      }),
      id: guestLineId(line.nftId, line.editionId),
      quantity: line.quantity,
    }
  })
}

export function useCartPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const announce = useAnnounce()
  const navigate = useNavigate()
  const guestLines = useSyncExternalStore(guestCart.subscribe, guestCart.get, () => [] as CartLineInput[])

  const cartQuery = useQuery({
    ...cartQueryOptions(user?.id ?? ''),
    enabled: Boolean(user),
  })

  const lines = useMemo(
    () => (user ? toLines(cartQuery.data?.items ?? []) : guestLines),
    [user, cartQuery.data?.items, guestLines],
  )

  const [draftCoupon, setDraftCoupon] = useState(() => couponStorage.get() ?? '')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(() => couponStorage.get())
  const [network] = useState<Network>('ethereum')
  const [couponError, setCouponError] = useState<string | null>(null)

  const quoteQuery = useQuery({
    queryKey: ['quote', user?.id ?? 'guest', lines, appliedCoupon, network],
    queryFn: ({ signal }) =>
      quoteApi.create(
        {
          items: lines,
          couponCode: appliedCoupon ?? undefined,
          network,
        },
        signal,
      ),
    enabled: lines.length > 0,
    staleTime: 10_000,
    retry: false,
  })

  useEffect(() => {
    if (quoteQuery.data) {
      try {
        sessionStorage.setItem('kurio:last-quote', quoteQuery.data.id)
      } catch {
        // ignore
      }
    }
  }, [quoteQuery.data])

  const items = useMemo(
    () => mergeDisplay(user ? (cartQuery.data?.items ?? null) : null, guestLines, quoteQuery.data),
    [user, cartQuery.data?.items, guestLines, quoteQuery.data],
  )

  const updateMutation = useMutation({
    mutationFn: async ({ id, quantity, maxPerOrder }: { id: string; quantity: number; maxPerOrder: number; name: string }) => {
      if (!user) {
        const parsed = parseGuestLineId(id)
        if (!parsed) throw new Error('Item inválido.')
        guestCart.update(parsed.nftId, parsed.editionId, quantity, maxPerOrder)
        return
      }
      const cart = await cartApi.updateItem(id, quantity)
      queryClient.setQueryData(cartQueryOptions(user.id).queryKey, cart)
    },
    onSuccess: (_result, variables) => {
      announce(`Quantidade de ${variables.name} atualizada para ${variables.quantity}.`)
    },
    onError: (error) => {
      toast.error(toApiError(error).message || (error instanceof Error ? error.message : 'Não foi possível atualizar.'))
    },
    onSettled: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: cartQueryOptions(user.id).queryKey })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      if (!user) {
        const parsed = parseGuestLineId(id)
        if (!parsed) throw new Error('Item inválido.')
        guestCart.remove(parsed.nftId, parsed.editionId)
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
    onError: (error) => {
      toast.error(toApiError(error).message || (error instanceof Error ? error.message : 'Não foi possível remover.'))
    },
    onSettled: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: cartQueryOptions(user.id).queryKey })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
  })

  const applyMutation = useMutation({
    mutationFn: async (code: string) => {
      const quote = await quoteApi.create({ items: lines, couponCode: code, network })
      return { quote, code }
    },
    onSuccess: ({ quote, code }) => {
      setAppliedCoupon(code)
      setDraftCoupon(code)
      setCouponError(null)
      couponStorage.set(code)
      queryClient.setQueryData(['quote', user?.id ?? 'guest', lines, code, network], quote)
      announce(`Cupom ${code} aplicado.`)
      toast.success(`Cupom ${code} aplicado.`)
    },
    onError: (error) => {
      const apiError = toApiError(error)
      setCouponError(apiError.fields.couponCode ?? apiError.message)
    },
  })

  function applyCoupon() {
    const code = draftCoupon.trim().toUpperCase()
    if (!code) {
      setCouponError('Informe um código promocional.')
      return
    }
    if (lines.length === 0) {
      setCouponError('Adicione itens ao carrinho antes de aplicar um cupom.')
      return
    }
    setCouponError(null)
    applyMutation.mutate(code)
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setDraftCoupon('')
    setCouponError(null)
    couponStorage.set(null)
    announce('Cupom removido.')
  }

  // Se a cotação com cupom falhar depois (ex.: cupom expirou), remove e mantém o carrinho.
  useEffect(() => {
    if (!quoteQuery.error || !appliedCoupon) return
    const error = toApiError(quoteQuery.error)
    if (error.code === 'COUPON_INVALID' || error.code === 'COUPON_EXPIRED') {
      setCouponError(error.message)
      setAppliedCoupon(null)
      couponStorage.set(null)
    }
  }, [quoteQuery.error, appliedCoupon])

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

  const isLoading = Boolean(user) ? cartQuery.isPending : false
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
    draftCoupon,
    setDraftCoupon,
    appliedCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
    applyingCoupon: applyMutation.isPending,
    network,
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
