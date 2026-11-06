import type { ApiErrorCode, CartLineInput } from '@/api/contracts'
import { ApiError } from '@/api/errors'

const STORAGE_KEY = 'kurio:guest-cart'

type Listener = (items: CartLineInput[]) => void

const listeners = new Set<Listener>()

function read(): CartLineInput[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is CartLineInput =>
        !!item &&
        typeof item === 'object' &&
        typeof item.nftId === 'string' &&
        typeof item.editionId === 'string' &&
        typeof item.quantity === 'number' &&
        item.quantity >= 1,
    )
  } catch {
    return []
  }
}

let current = typeof window === 'undefined' ? [] : read()

function write(items: CartLineInput[]) {
  current = items
  try {
    if (items.length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Sem storage: o carrinho do visitante vale só para a aba.
  }
  listeners.forEach((listener) => listener(items))
}

export const guestCart = {
  get: () => current,
  itemCount: () => current.reduce((total, item) => total + item.quantity, 0),

  set(items: CartLineInput[]) {
    write(items)
  },

  clear() {
    write([])
  },

  add(line: CartLineInput, maxPerOrder = Number.POSITIVE_INFINITY) {
    const items = [...current]
    const existing = items.find((item) => item.nftId === line.nftId && item.editionId === line.editionId)
    const quantity = (existing?.quantity ?? 0) + line.quantity
    assertQuantity(quantity, maxPerOrder)
    if (existing) existing.quantity = quantity
    else items.push({ ...line })
    write(items)
    return items
  },

  update(nftId: string, editionId: string, quantity: number, maxPerOrder = Number.POSITIVE_INFINITY) {
    assertQuantity(quantity, maxPerOrder)
    const items = current.map((item) =>
      item.nftId === nftId && item.editionId === editionId ? { ...item, quantity } : item,
    )
    if (!items.some((item) => item.nftId === nftId && item.editionId === editionId)) {
      throw guestCartError('Este item não está mais no carrinho.')
    }
    write(items)
    return items
  },

  remove(nftId: string, editionId: string) {
    write(current.filter((item) => !(item.nftId === nftId && item.editionId === editionId)))
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

function guestCartError(message: string, code?: ApiErrorCode) {
  return new ApiError({ kind: 'client', message, code })
}

function maxQuantityMessage(maxPerOrder: number) {
  if (maxPerOrder === 0) return 'Esta edição está esgotada.'
  return `Só é possível levar ${maxPerOrder} ${maxPerOrder === 1 ? 'unidade' : 'unidades'} desta edição.`
}

function assertQuantity(quantity: number, maxPerOrder: number) {
  if (quantity < 1) throw guestCartError('A quantidade mínima é 1.')
  if (quantity > maxPerOrder) throw guestCartError(maxQuantityMessage(maxPerOrder), 'AVAILABILITY_CONFLICT')
}

export function guestLineId(nftId: string, editionId: string) {
  return `${nftId}::${editionId}`
}

export function parseGuestLineId(id: string) {
  const [nftId, editionId] = id.split('::')
  if (!nftId || !editionId) throw guestCartError('Item inválido.')
  return { nftId, editionId }
}

export function toCartLines(items: CartLineInput[]): CartLineInput[] {
  return items.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity }))
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    current = read()
    listeners.forEach((listener) => listener(current))
  })
}
