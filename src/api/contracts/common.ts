import { z } from 'zod'

/** Valores em ETH trafegam como string decimal para não perder precisão. */
export const ethAmount = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')
export type EthAmount = z.infer<typeof ethAmount>

export const network = z.enum(['ethereum', 'polygon', 'solana'])
export type Network = z.infer<typeof network>
export const NETWORKS = network.options

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const isoDate = z.iso.datetime()

export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
}

export const apiErrorCode = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'AVAILABILITY_CONFLICT',
  'PRICE_CHANGED',
  'QUOTE_EXPIRED',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'IDEMPOTENCY_CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'TRANSIENT',
  'INTERNAL',
])
export type ApiErrorCode = z.infer<typeof apiErrorCode>

export const apiErrorBody = z.object({
  error: z.object({
    code: apiErrorCode,
    message: z.string(),
    /** Mensagens por campo, com o mesmo nome usado no payload. */
    fields: z.record(z.string(), z.string()).optional(),
    details: z.unknown().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBody>
