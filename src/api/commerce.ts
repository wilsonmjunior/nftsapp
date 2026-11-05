import { http } from '@/lib/http'

import {
  cart,
  favoriteToggleResponse,
  favoritesResponse,
  order,
  ordersResponse,
  quote,
  type CartLineInput,
  type CreateOrderInput,
  type OrderStatus,
  type QuoteInput,
} from './contracts'

export const favoritesApi = {
  async list(signal?: AbortSignal) {
    const { data } = await http.get('/favorites', { signal })
    return favoritesResponse.parse(data)
  },

  async add(nftId: string) {
    const { data } = await http.put(`/favorites/${encodeURIComponent(nftId)}`)
    return favoriteToggleResponse.parse(data)
  },

  async remove(nftId: string) {
    const { data } = await http.delete(`/favorites/${encodeURIComponent(nftId)}`)
    return favoriteToggleResponse.parse(data)
  },
}

export const cartApi = {
  async get(signal?: AbortSignal) {
    const { data } = await http.get('/cart', { signal })
    return cart.parse(data)
  },

  async addItem(input: CartLineInput) {
    const { data } = await http.post('/cart/items', input)
    return cart.parse(data)
  },

  async updateItem(itemId: string, quantity: number) {
    const { data } = await http.patch(`/cart/items/${encodeURIComponent(itemId)}`, { quantity })
    return cart.parse(data)
  },

  async removeItem(itemId: string) {
    const { data } = await http.delete(`/cart/items/${encodeURIComponent(itemId)}`)
    return cart.parse(data)
  },

  async merge(items: CartLineInput[]) {
    const { data } = await http.post('/cart/merge', { items })
    return cart.parse(data)
  },
}

export const quoteApi = {
  async create(input: QuoteInput, signal?: AbortSignal) {
    const { data } = await http.post('/quote', input, { signal })
    return quote.parse(data)
  },
}

export const ordersApi = {
  async create(input: CreateOrderInput, idempotencyKey: string) {
    const { data } = await http.post('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } })
    return order.parse(data)
  },

  async get(orderId: string, signal?: AbortSignal) {
    const { data } = await http.get(`/orders/${encodeURIComponent(orderId)}`, { signal })
    return order.parse(data)
  },

  async list(status?: OrderStatus, signal?: AbortSignal) {
    const { data } = await http.get('/orders', { params: { status }, signal })
    return ordersResponse.parse(data).items
  },
}
