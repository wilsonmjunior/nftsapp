import { delay, HttpResponse } from 'msw'

import { createOrderInput, orderStatus, type CartLineInput } from '@/api/contracts'
import { HTTP_TIMEOUT_MS } from '@/lib/http'
import { eth, toEthString } from '@/lib/eth'

import { digest } from '../crypto'
import {
  calculateQuote,
  QUOTE_TTL_MS,
  resolveCoupon,
  settleDueOrders,
  toOrder,
  toQuote,
  type QuoteCalculation,
} from '../db/domain'
import { db, type DbChange } from '../db/store'
import type { OrderRecord, QuoteRecord } from '../db/types'
import { fail, notFound, parseBody, requireUser, route } from '../route'
import { scenario } from '../scenarios'

export const PAYMENT_RESOLUTION_MS = 2500

const locks = new Map<string, Promise<unknown>>()

/** Serializa requisições com a mesma chave para cliques repetidos não criarem dois pedidos. */
async function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve()
  const current = previous.then(task, task)
  locks.set(key, current)
  try {
    return await current
  } finally {
    if (locks.get(key) === current) locks.delete(key)
  }
}

function sameLines(a: CartLineInput[], b: CartLineInput[]) {
  const key = (line: CartLineInput) => `${line.nftId}|${line.editionId}|${line.quantity}`
  return a.map(key).sort().join() === b.map(key).sort().join()
}

function saveQuote(userId: string, calculation: QuoteCalculation) {
  const now = Date.now()
  return db.mutate((state) => {
    const record: QuoteRecord = {
      id: db.nextId('qte'),
      userId,
      lines: calculation.lines,
      couponCode: calculation.couponCode,
      network: calculation.network,
      subtotal: calculation.subtotal,
      discount: calculation.discount,
      networkFee: calculation.networkFee,
      total: calculation.total,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    }
    state.quotes[record.id] = record
    return record
  })
}

/** Gatilhos de cenário: alteram o catálogo uma vez, no primeiro envio de pedido. */
function applyCheckoutTrigger(firstLine: CartLineInput) {
  const trigger = scenario.config.checkout
  if (trigger !== 'price-change' && trigger !== 'sold-out') return
  const mark = `checkout:${trigger}`
  if (db.state.triggered.includes(mark)) return

  db.mutate(
    (state) => {
      state.triggered.push(mark)
      const nft = state.nfts.find((item) => item.id === firstLine.nftId)
      const edition = nft?.editions.find((item) => item.id === firstLine.editionId)
      if (!nft || !edition) return
      if (trigger === 'price-change') edition.price = toEthString(eth(edition.price).plus('0.1'))
      else edition.available = 0
      nft.version += 1
    },
    [{ type: 'nft.updated', nftId: firstLine.nftId }],
  )
}

export const orderHandlers = [
  route('post', '/orders', 'orders.create', async ({ request }) => {
    const { user } = requireUser(request)
    const key = request.headers.get('Idempotency-Key')?.trim()
    if (!key) throw fail(400, 'VALIDATION_ERROR', 'Envie o header Idempotency-Key.')
    const input = await parseBody(request, createOrderInput)
    const payloadHash = await digest(input)

    return withLock(key, async () => {
      const previous = db.state.idempotency[key]
      if (previous) {
        if (previous.userId !== user.id || previous.payloadHash !== payloadHash) {
          throw fail(409, 'IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com outro conteúdo.')
        }
        settleDueOrders()
        const existing = db.state.orders.find((order) => order.id === previous.orderId)!
        return HttpResponse.json(toOrder(existing))
      }

      const quote = db.state.quotes[input.quoteId]
      if (!quote || (quote.userId !== null && quote.userId !== user.id) || Date.parse(quote.expiresAt) <= Date.now()) {
        throw fail(409, 'QUOTE_EXPIRED', 'A cotação expirou. Revise o pedido novamente.')
      }
      if (!sameLines(quote.lines, input.items) || quote.network !== input.network) {
        throw fail(422, 'VALIDATION_ERROR', 'Os itens enviados não correspondem à cotação.')
      }

      const wallet = Object.values(db.state.wallets[user.id] ?? {}).find((item) => item?.id === input.walletId)
      if (!wallet) throw fail(422, 'VALIDATION_ERROR', 'Selecione uma carteira cadastrada.', { fields: { walletId: 'Selecione uma carteira cadastrada.' } })

      applyCheckoutTrigger(input.items[0]!)

      const coupon = input.couponCode ? resolveCoupon(input.couponCode) : null
      if (coupon && 'problem' in coupon) {
        throw fail(409, 'PRICE_CHANGED', 'O código promocional não é mais válido. Revise o total.', {
          details: { quote: toQuote(saveQuote(user.id, calculateQuote(input.items, null, input.network))) },
        })
      }

      const fresh = calculateQuote(input.items, coupon?.coupon ?? null, input.network)
      if (fresh.lines.some((line) => line.issues.length > 0)) {
        throw fail(409, 'AVAILABILITY_CONFLICT', 'A disponibilidade de um ou mais itens mudou.', {
          details: { quote: toQuote(saveQuote(user.id, fresh)) },
        })
      }
      const priceChanged =
        !eth(fresh.total).eq(quote.total) ||
        fresh.lines.some((line, index) => !eth(line.unitPrice).eq(quote.lines[index]?.unitPrice ?? '-1'))
      if (priceChanged) {
        throw fail(409, 'PRICE_CHANGED', 'O preço de um ou mais itens mudou. Confirme o novo total.', {
          details: { quote: toQuote(saveQuote(user.id, fresh)) },
        })
      }

      const now = Date.now()
      const changes: DbChange[] = []
      const order = db.mutate((state) => {
        const record: OrderRecord = {
          id: db.nextId('ord'),
          userId: user.id,
          status: 'pending',
          version: 1,
          items: fresh.lines.map((line) => ({
            nftId: line.nftId,
            editionId: line.editionId,
            quantity: line.quantity,
            name: line.name,
            tokenId: line.tokenId,
            image: line.image,
            editionLabel: line.editionLabel,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
          subtotal: fresh.subtotal,
          discount: fresh.discount,
          networkFee: fresh.networkFee,
          total: fresh.total,
          coupon: fresh.coupon,
          network: input.network,
          wallet: { id: wallet.id, label: wallet.nickname, type: wallet.type, address: wallet.address },
          transaction: null,
          declineReason: null,
          outcome: scenario.config.paymentOutcome ?? 'confirmed',
          resolveAt: new Date(now + PAYMENT_RESOLUTION_MS).toISOString(),
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
        }

        for (const line of record.items) {
          const nft = state.nfts.find((item) => item.id === line.nftId)!
          const edition = nft.editions.find((item) => item.id === line.editionId)!
          if (edition.kind !== 'open') edition.available -= line.quantity
          nft.version += 1
          changes.push({ type: 'nft.updated', nftId: nft.id })
        }

        state.orders.push(record)
        state.idempotency[key] = { userId: user.id, payloadHash, orderId: record.id }
        delete state.quotes[quote.id]
        return record
      }, changes)

      if (scenario.config.checkout === 'timeout' && !db.state.triggered.includes('checkout:timeout')) {
        db.mutate((state) => {
          state.triggered.push('checkout:timeout')
        })
        // O pedido já existe; a resposta chega depois do timeout do cliente.
        await delay(HTTP_TIMEOUT_MS + 2000)
      }

      return HttpResponse.json(toOrder(order), { status: 201 })
    })
  }),

  route('get', '/orders', 'orders.list', ({ request }) => {
    const { user } = requireUser(request)
    settleDueOrders()
    const status = orderStatus.safeParse(new URL(request.url).searchParams.get('status'))
    const items = db.state.orders
      .filter((order) => order.userId === user.id && (!status.success || order.status === status.data))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toOrder)
    return HttpResponse.json({ items })
  }),

  route<{ orderId: string }>('get', '/orders/:orderId', 'orders.get', ({ request, params }) => {
    const { user } = requireUser(request)
    settleDueOrders()
    const order = db.state.orders.find((item) => item.id === params.orderId)
    // Pedido de outro usuário responde como inexistente para não vazar dados.
    if (!order || order.userId !== user.id) throw notFound('Pedido não encontrado.')
    return HttpResponse.json(toOrder(order))
  }),
]
