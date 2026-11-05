import { HttpResponse } from 'msw'

import { cartLineInput, mergeCartInput, quoteInput, updateCartItemInput } from '@/api/contracts'

import type { CouponRecord } from '../db/types'

import {
  calculateQuote,
  emptyCart,
  findEdition,
  findNft,
  maxPerOrder,
  QUOTE_TTL_MS,
  resolveCoupon,
  toCart,
  toQuote,
  toSummary,
} from '../db/domain'
import { db } from '../db/store'
import type { CartRecord, DbState } from '../db/types'
import { fail, notFound, optionalUser, parseBody, requireUser, route } from '../route'

function cartOf(state: DbState, userId: string): CartRecord {
  return (state.carts[userId] ??= emptyCart())
}

function touch(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = new Date().toISOString()
}

function resolveEdition(nftId: string, editionId: string) {
  const nft = findNft(nftId)
  const edition = nft && findEdition(nft, editionId)
  if (!nft || !edition) throw notFound('Este NFT ou edição não existe.')
  return edition
}

function availabilityConflict(limit: number) {
  return fail(
    409,
    'AVAILABILITY_CONFLICT',
    limit === 0 ? 'Esta edição está esgotada.' : `Só é possível levar ${limit} ${limit === 1 ? 'unidade' : 'unidades'} desta edição.`,
    { fields: { quantity: `Máximo disponível: ${limit}.` }, details: { maxPerOrder: limit } },
  )
}

export const favoriteHandlers = [
  route('get', '/favorites', 'favorites.list', ({ request }) => {
    const { user } = requireUser(request)
    const ids = db.state.favorites[user.id] ?? []
    const items = ids.map(findNft).filter((nft) => nft !== undefined).map(toSummary)
    return HttpResponse.json({ ids, items })
  }),

  route<{ nftId: string }>('put', '/favorites/:nftId', 'favorites.add', ({ request, params }) => {
    const { user } = requireUser(request)
    if (!findNft(params.nftId)) throw notFound('Este NFT não existe ou foi removido.')
    db.mutate((state) => {
      const ids = (state.favorites[user.id] ??= [])
      if (!ids.includes(params.nftId)) ids.unshift(params.nftId)
    })
    return HttpResponse.json({ nftId: params.nftId, favorited: true })
  }),

  route<{ nftId: string }>('delete', '/favorites/:nftId', 'favorites.remove', ({ request, params }) => {
    const { user } = requireUser(request)
    db.mutate((state) => {
      state.favorites[user.id] = (state.favorites[user.id] ?? []).filter((id) => id !== params.nftId)
    })
    return HttpResponse.json({ nftId: params.nftId, favorited: false })
  }),
]

export const cartHandlers = [
  route('get', '/cart', 'cart.get', ({ request }) => {
    const { user } = requireUser(request)
    return HttpResponse.json(toCart(db.state.carts[user.id] ?? emptyCart()))
  }),

  route('post', '/cart/items', 'cart.add', async ({ request }) => {
    const { user } = requireUser(request)
    const input = await parseBody(request, cartLineInput)
    const edition = resolveEdition(input.nftId, input.editionId)
    const existing = db.state.carts[user.id]?.items.find(
      (item) => item.nftId === input.nftId && item.editionId === input.editionId,
    )
    const quantity = (existing?.quantity ?? 0) + input.quantity
    if (quantity > maxPerOrder(edition)) throw availabilityConflict(maxPerOrder(edition))

    const cart = db.mutate((state) => {
      const draft = cartOf(state, user.id)
      const item = draft.items.find((entry) => entry.nftId === input.nftId && entry.editionId === input.editionId)
      if (item) {
        item.quantity = quantity
        item.priceAtAdd = edition.price
      } else {
        draft.items.push({ id: db.nextId('cit'), ...input, priceAtAdd: edition.price })
      }
      touch(draft)
      return draft
    })
    return HttpResponse.json(toCart(cart))
  }),

  route<{ itemId: string }>('patch', '/cart/items/:itemId', 'cart.update', async ({ request, params }) => {
    const { user } = requireUser(request)
    const { quantity } = await parseBody(request, updateCartItemInput)
    const item = db.state.carts[user.id]?.items.find((entry) => entry.id === params.itemId)
    if (!item) throw notFound('Este item não está mais no carrinho.')
    const edition = resolveEdition(item.nftId, item.editionId)
    if (quantity > maxPerOrder(edition)) throw availabilityConflict(maxPerOrder(edition))

    const cart = db.mutate((state) => {
      const draft = cartOf(state, user.id)
      const entry = draft.items.find((candidate) => candidate.id === params.itemId)!
      entry.quantity = quantity
      entry.priceAtAdd = edition.price
      touch(draft)
      return draft
    })
    return HttpResponse.json(toCart(cart))
  }),

  route<{ itemId: string }>('delete', '/cart/items/:itemId', 'cart.remove', ({ request, params }) => {
    const { user } = requireUser(request)
    const cart = db.mutate((state) => {
      const draft = cartOf(state, user.id)
      const before = draft.items.length
      draft.items = draft.items.filter((item) => item.id !== params.itemId)
      if (draft.items.length !== before) touch(draft)
      return draft
    })
    return HttpResponse.json(toCart(cart))
  }),

  route('post', '/cart/merge', 'cart.merge', async ({ request }) => {
    const { user } = requireUser(request)
    const { items } = await parseBody(request, mergeCartInput)

    const cart = db.mutate((state) => {
      const draft = cartOf(state, user.id)
      for (const line of items) {
        const nft = findNft(line.nftId)
        const edition = nft && findEdition(nft, line.editionId)
        if (!edition || maxPerOrder(edition) === 0) continue

        const existing = draft.items.find((item) => item.nftId === line.nftId && item.editionId === line.editionId)
        const quantity = Math.min((existing?.quantity ?? 0) + line.quantity, maxPerOrder(edition))
        if (existing) existing.quantity = quantity
        else draft.items.push({ id: db.nextId('cit'), ...line, quantity, priceAtAdd: edition.price })
      }
      if (items.length > 0) touch(draft)
      return draft
    })
    return HttpResponse.json(toCart(cart))
  }),
]

export const quoteHandlers = [
  route('post', '/quote', 'quote.create', async ({ request }) => {
    const auth = optionalUser(request)
    const input = await parseBody(request, quoteInput)
    let coupon: CouponRecord | null = null
    if (input.couponCode) {
      const resolved = resolveCoupon(input.couponCode)
      if ('problem' in resolved) {
        const message = resolved.problem === 'COUPON_EXPIRED' ? 'Este código promocional expirou.' : 'Código promocional inválido.'
        throw fail(422, resolved.problem, message, { fields: { couponCode: message } })
      }
      coupon = resolved.coupon
    }
    const calculation = calculateQuote(input.items, coupon, input.network ?? 'ethereum')

    const now = Date.now()
    const record = db.mutate((state) => {
      const quote = {
        id: db.nextId('qte'),
        userId: auth?.user.id ?? null,
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
      // Mantém só cotações recentes para o storage não crescer.
      for (const [id, existing] of Object.entries(state.quotes)) {
        if (Date.parse(existing.expiresAt) < now) delete state.quotes[id]
      }
      state.quotes[quote.id] = quote
      return quote
    })
    return HttpResponse.json(toQuote(record))
  }),
]
