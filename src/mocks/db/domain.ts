import type {
  Cart,
  CartLineInput,
  CollectorReview,
  Edition,
  LineIssue,
  Network,
  NftDetail,
  NftSummary,
  Order,
  PricedLine,
  Quote,
} from '@/api/contracts'
import { eth, sumEth, toEthString } from '@/lib/eth'

import { OPEN_EDITION_STOCK } from '../fixtures'
import { createRandom } from '../random'
import { db } from './store'
import type { CartRecord, CouponRecord, EditionRecord, NftRecord, OrderRecord, QuoteRecord } from './types'

export const MAX_PER_ORDER = 10
export const QUOTE_TTL_MS = 10 * 60_000

export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
}

const EXPLORERS: Record<Network, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

const EDITION_LABELS: Record<EditionRecord['kind'], string> = {
  '1/1': '1/1',
  '1/10': '1/10',
  '1/50': '1/50',
  open: 'Aberta',
}

export function findNft(nftId: string) {
  return db.state.nfts.find((nft) => nft.id === nftId)
}

export function findEdition(nft: NftRecord, editionId: string) {
  return nft.editions.find((edition) => edition.id === editionId)
}

export function maxPerOrder(edition: EditionRecord) {
  return Math.min(edition.available, edition.kind === '1/1' ? 1 : MAX_PER_ORDER)
}

export function defaultEdition(nft: NftRecord) {
  return (
    nft.editions.find((edition) => edition.kind === '1/50' && edition.available > 0) ??
    nft.editions.find((edition) => edition.available > 0) ??
    nft.editions[0]!
  )
}

export function isSoldOut(nft: NftRecord) {
  return nft.editions.every((edition) => edition.available === 0)
}

export function collectionOf(nft: NftRecord) {
  return db.state.collections.find((collection) => collection.id === nft.collectionId)!
}

export function toSummary(nft: NftRecord): NftSummary {
  const edition = defaultEdition(nft)
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    image: nft.image,
    collection: collectionOf(nft),
    network: nft.network,
    price: edition.price,
    originalPrice: edition.originalPrice,
    rare: nft.rare,
    soldOut: isSoldOut(nft),
    defaultEditionId: edition.id,
    listedAt: nft.listedAt,
    version: nft.version,
  }
}

function toEdition(edition: EditionRecord): Edition {
  return {
    id: edition.id,
    kind: edition.kind,
    label: EDITION_LABELS[edition.kind],
    supply: edition.supply,
    available: edition.available,
    maxPerOrder: maxPerOrder(edition),
    price: edition.price,
  }
}

const REVIEW_AUTHORS = [
  'Marina Costa',
  'Diego Alves',
  'Helena Prado',
  'Rafael Kim',
  'Sofia Mendes',
  'Igor Nascimento',
  'Lara Oliveira',
  'Theo Barbosa',
  'Camila Reis',
  'Bruno Ferreira',
]

const REVIEW_COMMENTS = [
  'A arte entrega exatamente o que a prévia prometia. Procedência clara e metadados bem organizados.',
  'Comprei a edição 1/50 e a experiência de colecionador foi fluida do começo ao fim.',
  'Os atributos combinam bem com o visual. Vale acompanhar o criador em próximos lançamentos.',
  'Qualidade alta e utilidade real para a comunidade. Recomendo para quem está começando.',
  'Entrega rápida dos arquivos desbloqueáveis e suporte atencioso do estúdio.',
  'O contraste de luz e textura nesta peça é o que mais me chamou atenção.',
]

function seedFromId(id: string) {
  let hash = 0
  for (const char of id) hash = (Math.imul(31, hash) + char.charCodeAt(0)) | 0
  return hash >>> 0 || 1
}

export function buildReviews(nft: NftRecord): CollectorReview[] {
  const count = Math.min(nft.rating.count, 12)
  if (count === 0) return []
  const random = createRandom(seedFromId(nft.id))
  const average = nft.rating.average
  return Array.from({ length: count }, (_, index) => {
    const rating = Math.min(5, Math.max(1, Math.round(average + random.next() - 0.45)))
    return {
      id: `rev_${nft.id}_${index + 1}`,
      author: REVIEW_AUTHORS[index % REVIEW_AUTHORS.length]!,
      rating,
      comment: random.pick(REVIEW_COMMENTS),
      createdAt: new Date(Date.parse(nft.listedAt) + index * 86_400_000).toISOString(),
    }
  })
}

export function toDetail(nft: NftRecord): NftDetail {
  return {
    ...toSummary(nft),
    description: nft.description,
    details: nft.details,
    attributes: nft.attributes,
    contractAddress: nft.contractAddress,
    royaltiesPercent: nft.royaltiesPercent,
    rating: nft.rating,
    reviews: buildReviews(nft),
    editions: nft.editions.map(toEdition),
    gallery: [nft.image, nft.image, nft.image, nft.image],
  }
}

export function nftEventData(nft: NftRecord) {
  const summary = toSummary(nft)
  return {
    price: summary.price,
    originalPrice: summary.originalPrice,
    soldOut: summary.soldOut,
    editions: nft.editions.map((edition) => ({
      id: edition.id,
      price: edition.price,
      available: edition.available,
      maxPerOrder: maxPerOrder(edition),
    })),
  }
}

/** `expectedPrice` sinaliza mudança de preço. */
export function priceLine(line: CartLineInput, expectedPrice?: string): PricedLine {
  const nft = findNft(line.nftId)
  const edition = nft && findEdition(nft, line.editionId)

  if (!nft || !edition) {
    return {
      ...line,
      name: 'NFT indisponível',
      tokenId: '',
      image: '',
      editionKind: 'open',
      editionLabel: '',
      unitPrice: '0',
      lineTotal: '0',
      available: 0,
      maxPerOrder: 0,
      nftVersion: 0,
      issues: ['NOT_FOUND'],
    }
  }

  const issues: LineIssue[] = []
  if (edition.available === 0) issues.push('SOLD_OUT')
  else if (line.quantity > maxPerOrder(edition)) issues.push('INSUFFICIENT_AVAILABILITY')
  if (expectedPrice !== undefined && !eth(expectedPrice).eq(edition.price)) issues.push('PRICE_CHANGED')

  return {
    ...line,
    name: nft.name,
    tokenId: nft.tokenId,
    image: nft.image,
    editionKind: edition.kind,
    editionLabel: EDITION_LABELS[edition.kind],
    unitPrice: edition.price,
    lineTotal: toEthString(eth(edition.price).times(line.quantity)),
    available: edition.kind === 'open' ? OPEN_EDITION_STOCK : edition.available,
    maxPerOrder: maxPerOrder(edition),
    nftVersion: nft.version,
    issues,
  }
}

export function toCart(cart: CartRecord): Cart {
  const items = cart.items.map((item) => ({ id: item.id, ...priceLine(item, item.priceAtAdd) }))
  return {
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: toEthString(sumEth(items.map((item) => item.lineTotal))),
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

export function emptyCart(): CartRecord {
  return { items: [], version: 0, updatedAt: new Date().toISOString() }
}

export type CouponProblem = 'COUPON_INVALID' | 'COUPON_EXPIRED'

export function resolveCoupon(code: string): { coupon: CouponRecord } | { problem: CouponProblem } {
  const coupon = db.state.coupons.find((item) => item.code === code.toUpperCase())
  if (!coupon) return { problem: 'COUPON_INVALID' }
  if (coupon.expiresAt && Date.parse(coupon.expiresAt) < Date.now()) return { problem: 'COUPON_EXPIRED' }
  return { coupon }
}

export type QuoteCalculation = Omit<QuoteRecord, 'id' | 'userId' | 'createdAt' | 'expiresAt'> & {
  coupon: { code: string; description: string } | null
}

/** Cupom já precisa estar validado. */
export function calculateQuote(items: CartLineInput[], coupon: CouponRecord | null, network: Network): QuoteCalculation {
  const lines = items.map((item) => priceLine(item))
  const subtotal = sumEth(lines.map((line) => line.lineTotal))

  let discount = eth(0)
  if (coupon) {
    discount =
      coupon.kind === 'percent'
        ? subtotal.times(coupon.value).div(100).round(6)
        : eth(coupon.value).gt(subtotal)
          ? subtotal
          : eth(coupon.value)
  }

  const networkFee = eth(NETWORK_FEES[network])
  return {
    lines,
    couponCode: coupon?.code ?? null,
    coupon: coupon ? { code: coupon.code, description: coupon.description } : null,
    network,
    subtotal: toEthString(subtotal),
    discount: toEthString(discount),
    networkFee: toEthString(networkFee),
    total: toEthString(subtotal.minus(discount).plus(networkFee)),
  }
}

export function toQuote(record: QuoteRecord): Quote {
  return {
    id: record.id,
    items: record.lines,
    subtotal: record.subtotal,
    discount: record.discount,
    networkFee: record.networkFee,
    total: record.total,
    coupon: record.couponCode
      ? { code: record.couponCode, description: db.state.coupons.find((item) => item.code === record.couponCode)?.description ?? '' }
      : null,
    network: record.network,
    purchasable: record.lines.every((line) => line.issues.length === 0),
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  }
}

export function toOrder(record: OrderRecord): Order {
  return {
    id: record.id,
    status: record.status,
    version: record.version,
    items: record.items,
    subtotal: record.subtotal,
    discount: record.discount,
    networkFee: record.networkFee,
    total: record.total,
    coupon: record.coupon,
    network: record.network,
    wallet: record.wallet,
    transaction: record.transaction,
    declineReason: record.declineReason,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export function explorerUrl(network: Network, hash: string) {
  return `${EXPLORERS[network]}${hash}`
}

export function settleDueOrders(now = Date.now()) {
  const due = db.state.orders.filter((order) => order.status === 'pending' && Date.parse(order.resolveAt) <= now)
  if (due.length === 0) return

  db.mutate(
    (state) => {
      for (const order of due) {
        const record = state.orders.find((item) => item.id === order.id)!
        record.status = record.outcome
        record.version += 1
        record.updatedAt = new Date(now).toISOString()

        if (record.outcome === 'confirmed') {
          const hash = `0x${record.id.replace(/\D/g, '').padStart(8, '0')}${'a91f'.repeat(14)}`
          record.transaction = { hash, explorerUrl: explorerUrl(record.network, hash) }
          removePurchasedFromCart(state.carts[record.userId], record)
        } else {
          record.declineReason = 'A carteira recusou a assinatura da transação.'
          releaseReservation(state.nfts, record)
        }
      }
    },
    due.flatMap((order) => {
      const changes: Array<{ type: 'order.updated'; orderId: string } | { type: 'nft.updated'; nftId: string }> = [
        { type: 'order.updated', orderId: order.id },
      ]
      if (order.outcome === 'declined') {
        for (const item of order.items) changes.push({ type: 'nft.updated', nftId: item.nftId })
      }
      return changes
    }),
  )
}

function removePurchasedFromCart(cart: CartRecord | undefined, order: OrderRecord) {
  if (!cart) return
  for (const line of order.items) {
    const item = cart.items.find((entry) => entry.nftId === line.nftId && entry.editionId === line.editionId)
    if (!item) continue
    item.quantity -= line.quantity
  }
  cart.items = cart.items.filter((item) => item.quantity > 0)
  cart.version += 1
  cart.updatedAt = new Date().toISOString()
}

function releaseReservation(nfts: NftRecord[], order: OrderRecord) {
  for (const line of order.items) {
    const nft = nfts.find((item) => item.id === line.nftId)
    const edition = nft?.editions.find((item) => item.id === line.editionId)
    if (!nft || !edition || edition.kind === 'open') continue
    edition.available += line.quantity
    nft.version += 1
  }
}
