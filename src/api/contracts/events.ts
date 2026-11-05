import { z } from 'zod'

import { ethAmount, isoDate } from './common'
import { orderStatus } from './commerce'

const eventBase = z.object({
  /** Identidade estável: o mesmo evento reenviado mantém o id. */
  eventId: z.string(),
  occurredAt: isoDate,
  /** Versão do recurso após a mudança; eventos com versão menor são descartados. */
  version: z.number().int().min(1),
})

export const nftUpdatedEvent = eventBase.extend({
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  data: z.object({
    price: ethAmount,
    originalPrice: ethAmount.nullable(),
    soldOut: z.boolean(),
    editions: z.array(
      z.object({
        id: z.string(),
        price: ethAmount,
        available: z.number().int().min(0),
        maxPerOrder: z.number().int().min(0),
      }),
    ),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEvent>

export const orderUpdatedEvent = eventBase.extend({
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  /** Dono do pedido; o cliente ignora eventos de outro usuário. */
  userId: z.string(),
  data: z.object({
    status: orderStatus,
    transaction: z.object({ hash: z.string(), explorerUrl: z.url() }).nullable(),
    declineReason: z.string().nullable(),
  }),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEvent>

export const realtimeEvent = z.discriminatedUnion('type', [nftUpdatedEvent, orderUpdatedEvent])
export type RealtimeEvent = z.infer<typeof realtimeEvent>
