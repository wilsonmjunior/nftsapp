import type { CartLineInput, Network } from '@/api/contracts'

export const QUOTE_SCOPE = 'quote'

type QuoteKeyParams = {
  /** `userId` autenticado ou `'guest'`. */
  owner: string
  lines: CartLineInput[]
  couponCode: string | null
  network: Network
}

export function quoteKey({ owner, lines, couponCode, network }: QuoteKeyParams) {
  return [QUOTE_SCOPE, owner, lines, couponCode, network] as const
}
