import { z } from 'zod'

import { ethAmount, isoDate, network } from './common'
import { editionKind, nftSummary } from './nft'

export const favoritesResponse = z.object({
  ids: z.array(z.string()),
  items: z.array(nftSummary),
})
export type FavoritesResponse = z.infer<typeof favoritesResponse>

export const favoriteToggleResponse = z.object({
  nftId: z.string(),
  favorited: z.boolean(),
})

export const cartLineInput = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1, 'A quantidade mínima é 1.'),
})
export type CartLineInput = z.infer<typeof cartLineInput>

export const lineIssue = z.enum(['PRICE_CHANGED', 'INSUFFICIENT_AVAILABILITY', 'SOLD_OUT', 'NOT_FOUND'])
export type LineIssue = z.infer<typeof lineIssue>

export const pricedLine = cartLineInput.extend({
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  editionKind,
  editionLabel: z.string(),
  unitPrice: ethAmount,
  lineTotal: ethAmount,
  available: z.number().int().min(0),
  maxPerOrder: z.number().int().min(0),
  nftVersion: z.number().int(),
  issues: z.array(lineIssue),
})
export type PricedLine = z.infer<typeof pricedLine>

export const cart = z.object({
  items: z.array(pricedLine.extend({ id: z.string() })),
  itemCount: z.number().int().min(0),
  subtotal: ethAmount,
  version: z.number().int().min(0),
  updatedAt: isoDate,
})
export type Cart = z.infer<typeof cart>
export type CartItem = Cart['items'][number]

export const updateCartItemInput = z.object({
  quantity: z.number().int().min(1, 'A quantidade mínima é 1.'),
})

export const mergeCartInput = z.object({ items: z.array(cartLineInput) })

export const quoteInput = z.object({
  items: z.array(cartLineInput).min(1, 'O carrinho está vazio.'),
  couponCode: z.string().trim().toUpperCase().min(1).max(32).optional(),
  network: network.optional(),
})
export type QuoteInput = z.infer<typeof quoteInput>

export const appliedCoupon = z.object({
  code: z.string(),
  description: z.string(),
})

export const quote = z.object({
  id: z.string(),
  items: z.array(pricedLine),
  subtotal: ethAmount,
  discount: ethAmount,
  networkFee: ethAmount,
  total: ethAmount,
  coupon: appliedCoupon.nullable(),
  network,
  /** Falso quando algum item tem pendência que impede a compra. */
  purchasable: z.boolean(),
  createdAt: isoDate,
  expiresAt: isoDate,
})
export type Quote = z.infer<typeof quote>

export const orderStatus = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof orderStatus>

export const walletType = z.enum(['metamask', 'walletconnect', 'coinbase'])
export type WalletType = z.infer<typeof walletType>
export const WALLET_TYPES = walletType.options

export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const collectorInfo = z.object({
  displayName: z.string().trim().min(1, 'Informe o nome de exibição.'),
  username: z.string().trim().min(1, 'Informe o nome de usuário.'),
  profileName: z.string().trim().min(1, 'Informe o nome do perfil.'),
  email: z.email('Digite um e-mail válido.'),
  referralCode: z.string().trim().min(1, 'Informe o código de indicação.'),
  ensName: z.string().trim().min(1, 'Informe o nome ENS.'),
  note: z.string().trim().max(500, 'Use no máximo 500 caracteres.').optional(),
})
export type CollectorInfo = z.infer<typeof collectorInfo>

export const createOrderInput = z.object({
  quoteId: z.string(),
  items: z.array(cartLineInput).min(1),
  couponCode: z.string().trim().toUpperCase().optional(),
  network,
  walletId: z.string(),
  collector: collectorInfo,
})
export type CreateOrderInput = z.infer<typeof createOrderInput>

export const orderLine = cartLineInput.extend({
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  editionLabel: z.string(),
  unitPrice: ethAmount,
  lineTotal: ethAmount,
})
export type OrderLine = z.infer<typeof orderLine>

export const order = z.object({
  id: z.string(),
  status: orderStatus,
  version: z.number().int().min(1),
  items: z.array(orderLine),
  subtotal: ethAmount,
  discount: ethAmount,
  networkFee: ethAmount,
  total: ethAmount,
  coupon: appliedCoupon.nullable(),
  network,
  wallet: z.object({
    id: z.string(),
    label: z.string(),
    type: walletType,
    address: z.string(),
  }),
  transaction: z
    .object({
      hash: z.string(),
      explorerUrl: z.url(),
    })
    .nullable(),
  declineReason: z.string().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
})
export type Order = z.infer<typeof order>

export const ordersResponse = z.object({ items: z.array(order) })
