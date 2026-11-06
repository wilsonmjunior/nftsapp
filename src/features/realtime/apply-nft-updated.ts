import type { Query, QueryClient } from '@tanstack/react-query'

import type { Cart, LineIssue, NftDetail, NftListResponse, NftSummary, NftUpdatedEvent } from '@/api/contracts'
import { catalogKeys } from '@/features/catalog/queries'
import { guestCart } from '@/features/cart/guest-cart'
import { QUOTE_SCOPE } from '@/features/cart/quote-query'
import { PRIVATE_SCOPE } from '@/features/session/session-query'
import { eth, formatEth, toEthString } from '@/lib/eth'

function patchSummary(summary: NftSummary, event: NftUpdatedEvent): NftSummary {
  if (summary.version >= event.version) return summary
  return {
    ...summary,
    version: event.version,
    price: event.data.price,
    originalPrice: event.data.originalPrice,
    soldOut: event.data.soldOut,
  }
}

function patchDetail(detail: NftDetail, event: NftUpdatedEvent): NftDetail {
  if (detail.version >= event.version) return detail
  const editions = detail.editions.map((edition) => {
    const patch = event.data.editions.find((item) => item.id === edition.id)
    if (!patch) return edition
    return {
      ...edition,
      price: patch.price,
      available: patch.available,
      maxPerOrder: patch.maxPerOrder,
    }
  })
  return {
    ...detail,
    version: event.version,
    price: event.data.price,
    originalPrice: event.data.originalPrice,
    soldOut: event.data.soldOut,
    editions,
  }
}

function patchCart(cart: Cart, event: NftUpdatedEvent): Cart {
  let changed = false
  const items = cart.items.map((item) => {
    if (item.nftId !== event.resource.id) return item
    if (item.nftVersion >= event.version) return item
    const edition = event.data.editions.find((entry) => entry.id === item.editionId)
    if (!edition) return { ...item, nftVersion: event.version, soldOut: event.data.soldOut } as typeof item

    const issues: LineIssue[] = item.issues.filter(
      (issue) => issue !== 'PRICE_CHANGED' && issue !== 'SOLD_OUT' && issue !== 'INSUFFICIENT_AVAILABILITY',
    )
    if (edition.available === 0) issues.push('SOLD_OUT')
    else if (item.quantity > edition.maxPerOrder) issues.push('INSUFFICIENT_AVAILABILITY')
    if (item.unitPrice !== edition.price) issues.push('PRICE_CHANGED')

    changed = true
    return {
      ...item,
      unitPrice: edition.price,
      lineTotal: toEthString(eth(edition.price).times(item.quantity)),
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      nftVersion: event.version,
      issues: [...new Set(issues)],
    }
  })

  if (!changed) return cart
  // Totais oficiais vêm do /quote; aqui só atualiza linhas e força refetch da cotação.
  return { ...cart, items, version: cart.version + 1 }
}

const cartQueries = {
  predicate: (query: Query) => query.queryKey[0] === PRIVATE_SCOPE && query.queryKey[2] === 'cart',
}

function noticeMessage(
  event: NftUpdatedEvent,
  { priceChanged, availabilityChanged, previousPrice }: { priceChanged: boolean; availabilityChanged: boolean; previousPrice?: string },
) {
  if (priceChanged) {
    const was = previousPrice ? ` (era ${formatEth(previousPrice)})` : ''
    return `Preço atualizado para ${formatEth(event.data.price)}${was}.`
  }
  if (event.data.soldOut) return 'Um NFT do carrinho ou catálogo esgotou.'
  if (availabilityChanged) return 'Disponibilidade de um NFT foi atualizada.'
  return `NFT atualizado (versão ${event.version}).`
}

export type NftUpdateNotice = {
  nftId: string
  message: string
  priceChanged: boolean
  availabilityChanged: boolean
}

export function applyNftUpdated(
  queryClient: QueryClient,
  event: NftUpdatedEvent,
  options?: { previousPrice?: string },
): NftUpdateNotice | null {
  const nftId = event.resource.id
  let touched = false
  let previousPrice = options?.previousPrice
  let availabilityChanged = false

  queryClient.setQueryData<NftDetail>(catalogKeys.detail(nftId), (current) => {
    if (!current) return current
    if (current.version >= event.version) return current
    previousPrice ??= current.price
    const before = current.editions.map((e) => `${e.id}:${e.available}`).join('|')
    const next = patchDetail(current, event)
    const after = next.editions.map((e) => `${e.id}:${e.available}`).join('|')
    availabilityChanged = before !== after
    touched = true
    return next
  })

  queryClient.setQueriesData<NftListResponse>({ queryKey: ['catalog', 'list'] }, (current) => {
    if (!current) return current
    let listTouched = false
    const items = current.items.map((item) => {
      if (item.id !== nftId) return item
      if (item.version >= event.version) return item
      previousPrice ??= item.price
      listTouched = true
      return patchSummary(item, event)
    })
    if (!listTouched) return current
    touched = true
    return { ...current, items }
  })

  queryClient.setQueryData<{ nft: NftSummary }>(catalogKeys.featured, (current) => {
    if (!current || current.nft.id !== nftId) return current
    if (current.nft.version >= event.version) return current
    previousPrice ??= current.nft.price
    touched = true
    return { nft: patchSummary(current.nft, event) }
  })

  queryClient.setQueriesData<Cart>(cartQueries, (current) => {
    if (!current?.items) return current
    const before = current.items.find((item) => item.nftId === nftId)
    if (before) previousPrice ??= before.unitPrice
    const next = patchCart(current, event)
    if (next !== current) touched = true
    return next
  })

  const inGuestCart = guestCart.get().some((line) => line.nftId === nftId)
  const inServerCart = queryClient
    .getQueriesData<Cart>(cartQueries)
    .some(([, cart]) => {
      const line = cart?.items.find((item) => item.nftId === nftId)
      if (line) previousPrice ??= line.unitPrice
      return Boolean(line)
    })

  if (inGuestCart || inServerCart) {
    void queryClient.invalidateQueries({ queryKey: [QUOTE_SCOPE] })
    void queryClient.invalidateQueries(cartQueries)
    touched = true
  }

  if (!touched) return null

  const priceChanged = Boolean(previousPrice && previousPrice !== event.data.price)
  const message = noticeMessage(event, { priceChanged, availabilityChanged, previousPrice })
  return { nftId, message, priceChanged, availabilityChanged: availabilityChanged || event.data.soldOut }
}
