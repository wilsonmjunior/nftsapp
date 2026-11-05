import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { cartApi, ordersApi, quoteApi } from '@/api/commerce'
import {
  collectorInfo,
  quote as quoteSchema,
  type CollectorInfo,
  type Network,
  type Order,
  type Quote,
  type Wallet,
  type WalletType,
} from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { useAnnounce } from '@/components/a11y/use-announce'
import { cartQueryOptions } from '@/features/cart/queries'
import { couponStorage } from '@/features/cart/coupon-storage'
import { useSession } from '@/features/session/use-session'
import { applyApiErrors } from '@/lib/form-errors'

import { checkoutIdempotency, pendingOrderStorage } from './checkout-storage'
import { walletsQueryOptions } from './queries'
import { simulateWalletConnect, type WalletConnectionStatus } from './wallet-connection'

function toLines(items: Array<{ nftId: string; editionId: string; quantity: number }>) {
  return items.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity }))
}

function listWallets(primary: Wallet | null, secondary: Wallet | null): Wallet[] {
  return [primary, secondary].filter((item): item is Wallet => Boolean(item))
}

export type ReviewState = {
  reason: 'PRICE_CHANGED' | 'AVAILABILITY_CONFLICT' | 'QUOTE_EXPIRED' | 'review'
  message: string
  quote: Quote
}

export function useCheckoutPage() {
  const { user } = useSession()
  const userId = user?.id ?? ''
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const announce = useAnnounce()

  const cartQuery = useQuery({
    ...cartQueryOptions(userId),
    enabled: Boolean(user),
  })

  const walletsQuery = useQuery({
    ...walletsQueryOptions(userId),
    enabled: Boolean(user),
  })

  const wallets = useMemo(
    () => listWallets(walletsQuery.data?.primary ?? null, walletsQuery.data?.secondary ?? null),
    [walletsQuery.data],
  )

  const [walletId, setWalletId] = useState<string | null>(null)
  const [network, setNetwork] = useState<Network>('ethereum')
  const [connection, setConnection] = useState<WalletConnectionStatus>('disconnected')
  const [connectingType, setConnectingType] = useState<WalletType | null>(null)
  const [draftCoupon, setDraftCoupon] = useState(() => couponStorage.get() ?? '')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(() => couponStorage.get())
  const [couponError, setCouponError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewState | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedWallet = wallets.find((item) => item.id === walletId) ?? null

  // Prefill carteira principal quando a lista chega.
  useEffect(() => {
    if (walletId || wallets.length === 0) return
    const primary = wallets.find((item) => item.slot === 'primary') ?? wallets[0]!
    setWalletId(primary.id)
    setNetwork(primary.network)
  }, [wallets, walletId])

  const lines = useMemo(() => toLines(cartQuery.data?.items ?? []), [cartQuery.data?.items])

  const quoteQuery = useQuery({
    queryKey: ['quote', userId, lines, appliedCoupon, network],
    queryFn: ({ signal }) =>
      quoteApi.create(
        {
          items: lines,
          couponCode: appliedCoupon ?? undefined,
          network,
        },
        signal,
      ),
    enabled: Boolean(user) && lines.length > 0,
    staleTime: 8_000,
    retry: false,
  })

  const activeQuote = review?.quote ?? quoteQuery.data

  const form = useForm<CollectorInfo>({
    resolver: zodResolver(collectorInfo),
    mode: 'onTouched',
    defaultValues: {
      displayName: '',
      username: '',
      profileName: '',
      email: '',
      referralCode: '',
      ensName: '',
      note: '',
    },
  })

  // Prefill do perfil + carteira selecionada.
  useEffect(() => {
    if (!user) return
    const wallet = selectedWallet
    form.reset({
      displayName: wallet?.displayName || user.displayName,
      username: user.username,
      profileName: wallet?.profileName || user.username,
      email: wallet?.email || user.email,
      referralCode: wallet?.referralCode || '',
      ensName: wallet?.ensName || user.ensName || '',
      note: form.getValues('note') || '',
    })
  }, [user, selectedWallet, form])

  // Pedido pendente persistido: retoma o acompanhamento se ainda estiver aberto.
  useEffect(() => {
    const pendingId = pendingOrderStorage.get()
    if (!pendingId || !user) return
    let cancelled = false
    void ordersApi
      .get(pendingId)
      .then((order) => {
        if (cancelled) return
        if (order.status === 'pending') {
          void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
          return
        }
        pendingOrderStorage.clear()
        checkoutIdempotency.clear()
      })
      .catch(() => {
        if (!cancelled) pendingOrderStorage.clear()
      })
    return () => {
      cancelled = true
    }
  }, [user, navigate])

  const applyCouponMutation = useMutation({
    mutationFn: async (code: string) => {
      const quote = await quoteApi.create({ items: lines, couponCode: code, network })
      return { quote, code }
    },
    onSuccess: ({ quote, code }) => {
      setAppliedCoupon(code)
      setDraftCoupon(code)
      setCouponError(null)
      couponStorage.set(code)
      queryClient.setQueryData(['quote', userId, lines, code, network], quote)
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
    setCouponError(null)
    applyCouponMutation.mutate(code)
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setDraftCoupon('')
    setCouponError(null)
    couponStorage.set(null)
    announce('Cupom removido.')
  }

  function selectWallet(id: string) {
    const wallet = wallets.find((item) => item.id === id)
    if (!wallet) return
    setWalletId(id)
    setNetwork(wallet.network)
    if (connection === 'connected') setConnection('disconnected')
  }

  function selectNetwork(next: Network) {
    setNetwork(next)
  }

  async function connectWallet(type: WalletType, outcome: 'accept' | 'refuse' = 'accept') {
    if (!selectedWallet) {
      toast.error('Cadastre ou selecione uma carteira antes de conectar.')
      return
    }
    setConnectingType(type)
    setConnection('connecting')
    const result = await simulateWalletConnect(outcome)
    setConnection(result)
    setConnectingType(null)
    if (result === 'connected') {
      announce(`Carteira ${type} conectada.`)
      toast.success('Carteira conectada.')
    } else {
      announce('Conexão da carteira recusada.')
      toast.error('Conexão recusada na carteira.')
    }
  }

  function disconnectWallet() {
    setConnection('disconnected')
    announce('Carteira desconectada.')
  }

  async function placeOrder(collector: CollectorInfo, quote: Quote) {
    if (!selectedWallet) {
      setFormError('Selecione uma carteira cadastrada.')
      return
    }
    if (connection !== 'connected') {
      setFormError('Conecte a carteira antes de pagar.')
      return
    }
    if (!quote.purchasable) {
      setFormError('Resolva os itens com problema antes de finalizar.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    const key = checkoutIdempotency.ensure(true)

    const input = {
      quoteId: quote.id,
      items: toLines(quote.items),
      couponCode: appliedCoupon ?? undefined,
      network,
      walletId: selectedWallet.id,
      collector,
    }

    try {
      const order = await ordersApi.create(input, key)
      pendingOrderStorage.set(order.id)
      queryClient.setQueryData(cartQueryOptions(userId).queryKey, await cartApi.get().catch(() => undefined))
      void queryClient.invalidateQueries({ queryKey: cartQueryOptions(userId).queryKey })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
      announce('Pedido enviado. Aguardando confirmação.')
      void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
    } catch (error) {
      const apiError = toApiError(error)

      if (apiError.kind === 'timeout') {
        // Timeout após criar: mesma chave recupera o pedido.
        try {
          const recovered = await ordersApi.create(input, key)
          pendingOrderStorage.set(recovered.id)
          announce('Pedido recuperado após timeout.')
          void navigate({ to: '/pedidos/$orderId', params: { orderId: recovered.id } })
          return
        } catch (retryError) {
          const pending = await recoverPendingOrder()
          if (pending) {
            pendingOrderStorage.set(pending.id)
            void navigate({ to: '/pedidos/$orderId', params: { orderId: pending.id } })
            return
          }
          setFormError(toApiError(retryError).message)
          return
        }
      }

      if (
        apiError.code === 'PRICE_CHANGED' ||
        apiError.code === 'AVAILABILITY_CONFLICT' ||
        apiError.code === 'QUOTE_EXPIRED'
      ) {
        const nextQuote = parseQuoteDetails(apiError.details) ?? (await refreshQuote())
        if (nextQuote) {
          queryClient.setQueryData(['quote', userId, lines, appliedCoupon, network], nextQuote)
          checkoutIdempotency.rotate()
          setReview({
            reason: apiError.code,
            message: apiError.message,
            quote: nextQuote,
          })
          announce(apiError.message)
          return
        }
      }

      const fieldMessage = applyApiErrors(apiError, form.setError, [
        'displayName',
        'username',
        'profileName',
        'email',
        'referralCode',
        'ensName',
        'note',
      ])
      setFormError(fieldMessage || apiError.message)
      // Falha: carrinho permanece intacto (não limpamos cupom nem itens).
    } finally {
      setSubmitting(false)
    }
  }

  async function recoverPendingOrder(): Promise<Order | null> {
    try {
      const pending = await ordersApi.list('pending')
      return pending[0] ?? null
    } catch {
      return null
    }
  }

  async function refreshQuote() {
    try {
      return await quoteApi.create({
        items: lines,
        couponCode: appliedCoupon ?? undefined,
        network,
      })
    } catch {
      return undefined
    }
  }

  function openReview() {
    const quote = activeQuote
    if (!quote) return
    setReview({ reason: 'review', message: 'Confirme os totais antes de enviar o pagamento.', quote })
  }

  function dismissReview() {
    setReview(null)
  }

  function confirmReview() {
    if (!review || submitting) return
    const quote = review.quote
    void form.handleSubmit(async (values) => {
      await placeOrder(values, quote)
      // Fecha a revisão só depois do envio (sucesso navega; falha pode reabrir outro review).
      setReview((current) => (current?.quote.id === quote.id ? null : current))
    })()
  }

  /** Valida o formulário e abre a revisão; o envio real ocorre em `confirmReview`. */
  const submit = form.handleSubmit(() => {
    if (!activeQuote) {
      setFormError('Aguarde a cotação antes de pagar.')
      return
    }
    if (connection !== 'connected') {
      setFormError('Conecte a carteira antes de pagar.')
      return
    }
    openReview()
  })

  const isLoading = cartQuery.isPending || walletsQuery.isPending
  const isEmpty = !isLoading && lines.length === 0
  const quotePending = lines.length > 0 && (quoteQuery.isPending || quoteQuery.isFetching) && !review

  return {
    user,
    form,
    formError,
    items: activeQuote?.items ?? [],
    lines,
    isLoading,
    isEmpty,
    quote: activeQuote,
    quotePending,
    quoteError: quoteQuery.error ? toApiError(quoteQuery.error) : null,
    draftCoupon,
    setDraftCoupon,
    appliedCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
    applyingCoupon: applyCouponMutation.isPending,
    wallets,
    walletId,
    selectedWallet,
    selectWallet,
    network,
    selectNetwork,
    connection,
    connectingType,
    connectWallet,
    disconnectWallet,
    review,
    dismissReview,
    confirmReview,
    openReview,
    submit,
    submitting,
    canPay:
      Boolean(activeQuote?.purchasable) &&
      connection === 'connected' &&
      Boolean(selectedWallet) &&
      !submitting &&
      !quotePending,
  }
}

function parseQuoteDetails(details: unknown): Quote | undefined {
  if (!details || typeof details !== 'object') return undefined
  const raw = (details as { quote?: unknown }).quote
  const parsed = quoteSchema.safeParse(raw)
  return parsed.success ? parsed.data : undefined
}
