import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { cartApi, ordersApi, quoteApi } from '@/api/commerce'
import {
  collectorInfo,
  quote as quoteSchema,
  type ApiErrorCode,
  type CollectorInfo,
  type CreateOrderInput,
  type Network,
  type Order,
  type Quote,
  type Wallet,
  type WalletType,
} from '@/api/contracts'
import { toApiError, type ApiError } from '@/api/errors'
import { useAnnounce } from '@/components/a11y/use-announce'
import { toCartLines } from '@/features/cart/guest-cart'
import { cartQueryOptions } from '@/features/cart/queries'
import { QUOTE_SCOPE, quoteKey } from '@/features/cart/quote-query'
import { useCoupon } from '@/features/cart/use-coupon'
import { useSession } from '@/features/session/use-session'
import { applyApiErrors } from '@/lib/form-errors'

import { checkoutIdempotency, pendingOrderStorage } from './checkout-storage'
import { walletsQueryOptions } from './queries'
import { simulateWalletConnect, type WalletConnectionStatus } from './wallet-connection'

const COLLECTOR_FIELDS = collectorInfo.keyof().options

const EMPTY_COLLECTOR: CollectorInfo = {
  displayName: '',
  username: '',
  profileName: '',
  email: '',
  referralCode: '',
  ensName: '',
  note: '',
}

const QUOTE_CONFLICT_CODES = ['PRICE_CHANGED', 'AVAILABILITY_CONFLICT', 'QUOTE_EXPIRED'] as const
type QuoteConflictCode = (typeof QUOTE_CONFLICT_CODES)[number]

function isQuoteConflict(code: ApiErrorCode | undefined): code is QuoteConflictCode {
  return QUOTE_CONFLICT_CODES.includes(code as QuoteConflictCode)
}

export type ReviewState = {
  reason: QuoteConflictCode | 'review'
  message: string
  quote: Quote
}

function listWallets(primary: Wallet | null, secondary: Wallet | null): Wallet[] {
  return [primary, secondary].filter((wallet): wallet is Wallet => wallet !== null)
}

function defaultWallet(wallets: Wallet[]): Wallet | null {
  return wallets.find((wallet) => wallet.slot === 'primary') ?? wallets[0] ?? null
}

function parseQuoteDetails(details: unknown): Quote | undefined {
  if (!details || typeof details !== 'object') return undefined
  const parsed = quoteSchema.safeParse((details as { quote?: unknown }).quote)
  return parsed.success ? parsed.data : undefined
}

async function findPendingOrder(): Promise<Order | null> {
  try {
    const pending = await ordersApi.list('pending')
    return pending[0] ?? null
  } catch {
    return null
  }
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

  const [chosenWalletId, setChosenWalletId] = useState<string | null>(null)
  const [chosenNetwork, setChosenNetwork] = useState<Network | null>(null)
  const [connection, setConnection] = useState<WalletConnectionStatus>('disconnected')
  const [connectingType, setConnectingType] = useState<WalletType | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewState | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedWallet = wallets.find((wallet) => wallet.id === chosenWalletId) ?? defaultWallet(wallets)
  const network = chosenNetwork ?? selectedWallet?.network ?? 'ethereum'

  const lines = useMemo(() => toCartLines(cartQuery.data?.items ?? []), [cartQuery.data?.items])

  const { dropIfRejected, ...coupon } = useCoupon({ owner: userId, lines, network })
  const { appliedCoupon } = coupon
  const currentQuoteKey = quoteKey({ owner: userId, lines, couponCode: appliedCoupon, network })

  function quoteRequest() {
    return { items: lines, couponCode: appliedCoupon ?? undefined, network }
  }

  const quoteQuery = useQuery({
    queryKey: currentQuoteKey,
    queryFn: async ({ signal }) => {
      try {
        return await quoteApi.create(quoteRequest(), signal)
      } catch (error) {
        if (appliedCoupon) dropIfRejected(error)
        throw error
      }
    },
    enabled: Boolean(user) && lines.length > 0,
    staleTime: 8_000,
    retry: false,
  })

  const activeQuote = review?.quote ?? quoteQuery.data

  const form = useForm<CollectorInfo>({
    resolver: zodResolver(collectorInfo),
    mode: 'onTouched',
    defaultValues: EMPTY_COLLECTOR,
  })

  useEffect(() => {
    if (!user) return
    form.reset({
      displayName: selectedWallet?.displayName || user.displayName,
      username: user.username,
      profileName: selectedWallet?.profileName || user.username,
      email: selectedWallet?.email || user.email,
      referralCode: selectedWallet?.referralCode || '',
      ensName: selectedWallet?.ensName || user.ensName || '',
      note: form.getValues('note') || '',
    })
  }, [user, selectedWallet, form])

  function goToOrder(orderId: string) {
    pendingOrderStorage.set(orderId)
    void navigate({ to: '/pedidos/$orderId', params: { orderId } })
  }

  useEffect(() => {
    const pendingId = pendingOrderStorage.get()
    if (!pendingId || !user) return
    const controller = new AbortController()
    void ordersApi
      .get(pendingId)
      .then((order) => {
        if (controller.signal.aborted) return
        if (order.status === 'pending') {
          void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
          return
        }
        pendingOrderStorage.clear()
        checkoutIdempotency.clear()
      })
      .catch(() => {
        if (!controller.signal.aborted) pendingOrderStorage.clear()
      })
    return () => controller.abort()
  }, [user, navigate])

  function selectWallet(id: string) {
    if (!wallets.some((wallet) => wallet.id === id)) return
    setChosenWalletId(id)
    setChosenNetwork(null)
    if (connection === 'connected') setConnection('disconnected')
  }

  async function connectWallet(type: WalletType, outcome: 'accept' | 'refuse' = 'accept') {
    if (!selectedWallet) {
      toast.error('Cadastre ou selecione uma carteira antes de conectar.')
      return
    }
    setConnectingType(type)
    setConnection('connecting')
    const status = await simulateWalletConnect(outcome)
    setConnection(status)
    setConnectingType(null)
    if (status === 'connected') {
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

  function orderBlocker(quote: Quote): string | null {
    if (connection !== 'connected') return 'Conecte a carteira antes de pagar.'
    if (!quote.purchasable) return 'Resolva os itens com problema antes de finalizar.'
    return null
  }

  async function refreshCartAfterOrder() {
    const cartKey = cartQueryOptions(userId).queryKey
    queryClient.setQueryData(cartKey, await cartApi.get().catch(() => undefined))
    void queryClient.invalidateQueries({ queryKey: cartKey })
    void queryClient.invalidateQueries({ queryKey: [QUOTE_SCOPE] })
  }

  /** Após timeout o pedido pode ter sido criado: a mesma chave de idempotência o recupera. */
  async function recoverAfterTimeout(input: CreateOrderInput, idempotencyKey: string) {
    try {
      const recovered = await ordersApi.create(input, idempotencyKey)
      announce('Pedido recuperado após timeout.')
      goToOrder(recovered.id)
    } catch (retryError) {
      const pending = await findPendingOrder()
      if (pending) goToOrder(pending.id)
      else setFormError(toApiError(retryError).message)
    }
  }

  async function fetchFreshQuote() {
    try {
      return await quoteApi.create(quoteRequest())
    } catch {
      return undefined
    }
  }

  /** Abre a revisão com a nova cotação; devolve `false` se não houver cotação para revisar. */
  async function reviewQuoteConflict(apiError: ApiError, reason: QuoteConflictCode) {
    const nextQuote = parseQuoteDetails(apiError.details) ?? (await fetchFreshQuote())
    if (!nextQuote) return false
    queryClient.setQueryData(currentQuoteKey, nextQuote)
    checkoutIdempotency.rotate()
    setReview({ reason, message: apiError.message, quote: nextQuote })
    announce(apiError.message)
    return true
  }

  async function handleOrderError(error: unknown, input: CreateOrderInput, idempotencyKey: string) {
    const apiError = toApiError(error)
    if (apiError.kind === 'timeout') {
      await recoverAfterTimeout(input, idempotencyKey)
      return
    }
    if (isQuoteConflict(apiError.code) && (await reviewQuoteConflict(apiError, apiError.code))) return
    // O carrinho fica intacto: cupom e itens continuam para nova tentativa.
    setFormError(applyApiErrors(apiError, form.setError, COLLECTOR_FIELDS) ?? apiError.message)
  }

  async function placeOrder(collector: CollectorInfo, quote: Quote) {
    if (!selectedWallet) {
      setFormError('Selecione uma carteira cadastrada.')
      return
    }
    const blocker = orderBlocker(quote)
    if (blocker) {
      setFormError(blocker)
      return
    }

    setSubmitting(true)
    setFormError(null)
    const idempotencyKey = checkoutIdempotency.ensure(true)
    const input: CreateOrderInput = {
      quoteId: quote.id,
      items: toCartLines(quote.items),
      couponCode: appliedCoupon ?? undefined,
      network,
      walletId: selectedWallet.id,
      collector,
    }

    try {
      const order = await ordersApi.create(input, idempotencyKey)
      await refreshCartAfterOrder()
      announce('Pedido enviado. Aguardando confirmação.')
      goToOrder(order.id)
    } catch (error) {
      await handleOrderError(error, input, idempotencyKey)
    } finally {
      setSubmitting(false)
    }
  }

  function confirmReview() {
    if (!review || submitting) return
    const quote = review.quote
    void form.handleSubmit(async (values) => {
      await placeOrder(values, quote)
      setReview((current) => (current?.quote.id === quote.id ? null : current))
    })()
  }

  const submit = form.handleSubmit(() => {
    if (!activeQuote) {
      setFormError('Aguarde a cotação antes de pagar.')
      return
    }
    if (connection !== 'connected') {
      setFormError('Conecte a carteira antes de pagar.')
      return
    }
    setReview({ reason: 'review', message: 'Confirme os totais antes de enviar o pagamento.', quote: activeQuote })
  })

  const isLoading = cartQuery.isPending || walletsQuery.isPending
  const quotePending = lines.length > 0 && (quoteQuery.isPending || quoteQuery.isFetching) && !review

  return {
    form,
    formError,
    isLoading,
    isEmpty: !isLoading && lines.length === 0,
    quote: activeQuote,
    quotePending,
    ...coupon,
    wallets,
    walletId: selectedWallet?.id ?? null,
    selectWallet,
    network,
    selectNetwork: setChosenNetwork,
    connection,
    connectingType,
    connectWallet,
    disconnectWallet,
    review,
    dismissReview: () => setReview(null),
    confirmReview,
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
