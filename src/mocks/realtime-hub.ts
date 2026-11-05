import type { NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from '@/api/contracts'

import { findNft, nftEventData } from './db/domain'
import { db, type DbChange } from './db/store'

type Emitter = {
  emit: (event: string, ...data: unknown[]) => void
  userId: string | null
}

const clients = new Set<Emitter>()
let lastBroadcast: RealtimeEvent | null = null

function buildNftEvent(nftId: string, versionOverride?: number): NftUpdatedEvent | null {
  const nft = findNft(nftId)
  if (!nft) return null
  const version = versionOverride ?? nft.version
  return {
    type: 'nft.updated',
    eventId: `evt_nft_${nftId}_v${version}`,
    occurredAt: new Date().toISOString(),
    version,
    resource: { type: 'nft', id: nftId },
    data: nftEventData(nft),
  }
}

function buildOrderEvent(orderId: string, versionOverride?: number): OrderUpdatedEvent | null {
  const order = db.state.orders.find((item) => item.id === orderId)
  if (!order) return null
  const version = versionOverride ?? order.version
  return {
    type: 'order.updated',
    eventId: `evt_order_${orderId}_v${version}`,
    occurredAt: new Date().toISOString(),
    version,
    resource: { type: 'order', id: orderId },
    userId: order.userId,
    data: {
      status: order.status,
      transaction: order.transaction,
      declineReason: order.declineReason,
    },
  }
}

function broadcast(event: RealtimeEvent) {
  lastBroadcast = event
  for (const client of clients) {
    if (event.type === 'order.updated' && client.userId !== event.userId) continue
    client.emit(event.type, event)
  }
}

export function getLastBroadcast() {
  return lastBroadcast
}

function onDbChange(change: DbChange) {
  const event =
    change.type === 'nft.updated' ? buildNftEvent(change.nftId) : buildOrderEvent(change.orderId)
  if (event) broadcast(event)
}

let started = false

export function startRealtimeHub() {
  if (started) return
  started = true
  db.subscribe(onDbChange)
}

export function registerRealtimeClient(client: { emit: (event: string, ...data: unknown[]) => void }) {
  const state: Emitter = { emit: client.emit.bind(client), userId: null }
  clients.add(state)
  return {
    setUserId(userId: string | null) {
      state.userId = userId
    },
    dispose() {
      clients.delete(state)
    },
  }
}

export function authenticateToken(token: string | null | undefined) {
  if (!token) return null
  const session = db.state.sessions.find((item) => item.token === token)
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null
  return session.userId
}

/** Reemite o estado atual (mesmo eventId da versão) — útil para testar dedupe. */
export function rebroadcastNft(nftId: string) {
  const event = buildNftEvent(nftId)
  if (event) broadcast(event)
  return event
}

/** Emite um evento com versão antiga para o cliente descartar. */
export function rebroadcastStaleNft(nftId: string, version: number) {
  const event = buildNftEvent(nftId, version)
  if (event) broadcast(event)
  return event
}

export function rebroadcastOrder(orderId: string) {
  const event = buildOrderEvent(orderId)
  if (event) broadcast(event)
  return event
}

export function connectedClientCount() {
  return clients.size
}
