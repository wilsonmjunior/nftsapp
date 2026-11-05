import type { EditionKind, EthAmount, Network, WalletInput, WalletSlot } from '@/api/contracts'
import type { OrderLine, OrderStatus, PricedLine } from '@/api/contracts'

export type EditionRecord = {
  id: string
  kind: EditionKind
  supply: number | null
  available: number
  price: EthAmount
  originalPrice: EthAmount | null
}

export type NftRecord = {
  id: string
  name: string
  tokenId: string
  image: string
  collectionId: string
  network: Network
  rare: boolean
  featured: boolean
  description: string
  details: string[]
  attributes: string[]
  contractAddress: string
  royaltiesPercent: number
  rating: { average: number; count: number }
  popularity: number
  listedAt: string
  editions: EditionRecord[]
  version: number
}

export type UserRecord = {
  id: string
  username: string
  displayName: string
  email: string
  passwordHash: string
  avatarUrl: string | null
  ensName: string | null
  walletNickname: string | null
  createdAt: string
}

export type SessionRecord = {
  token: string
  userId: string
  expiresAt: string
  revoked: boolean
}

export type CartItemRecord = {
  id: string
  nftId: string
  editionId: string
  quantity: number
  /** Preço visto ao adicionar; diferença vira aviso de preço alterado. */
  priceAtAdd: EthAmount
}

export type CartRecord = {
  items: CartItemRecord[]
  version: number
  updatedAt: string
}

export type CouponRecord = {
  code: string
  description: string
  kind: 'percent' | 'fixed'
  value: string
  expiresAt: string | null
}

export type WalletRecord = WalletInput & {
  id: string
  slot: WalletSlot
  version: number
}

export type QuoteRecord = {
  id: string
  userId: string | null
  lines: PricedLine[]
  couponCode: string | null
  network: Network
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  createdAt: string
  expiresAt: string
}

export type OrderRecord = {
  id: string
  userId: string
  status: OrderStatus
  version: number
  items: OrderLine[]
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  coupon: { code: string; description: string } | null
  network: Network
  wallet: { id: string; label: string; type: WalletInput['type']; address: string }
  transaction: { hash: string; explorerUrl: string } | null
  declineReason: string | null
  /** Resultado definido na criação e aplicado em `resolveAt`. */
  outcome: 'confirmed' | 'declined'
  resolveAt: string
  createdAt: string
  updatedAt: string
}

export type IdempotencyRecord = {
  userId: string
  payloadHash: string
  orderId: string
}

export type DbState = {
  schemaVersion: number
  sequence: number
  collections: Array<{ id: string; name: string }>
  nfts: NftRecord[]
  users: UserRecord[]
  sessions: SessionRecord[]
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  coupons: CouponRecord[]
  wallets: Record<string, Partial<Record<WalletSlot, WalletRecord>>>
  quotes: Record<string, QuoteRecord>
  orders: OrderRecord[]
  idempotency: Record<string, IdempotencyRecord>
  /** Gatilhos de cenário já disparados (cada um dispara uma vez). */
  triggered: string[]
}
