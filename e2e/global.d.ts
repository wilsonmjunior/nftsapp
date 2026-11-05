type MockControl = {
  setScenario(name: string, seed?: number): void
  getScenario(): { name: string; seed: number }
  reset(): void
  expireSessions(): void
  failNext(endpoint: string, options?: { status?: number; times?: number }): void
  updateNft(nftId: string, patch: { editionId?: string; price?: string; available?: number }): void
  settleOrders(): void
  rebroadcastNft(nftId: string): unknown
  rebroadcastStaleNft(nftId: string, version: number): unknown
  rebroadcastOrder(orderId: string): unknown
  socketClients(): number
  lastBroadcast(): { type: string; eventId: string; version: number } | null
}

type KurioSocketBridge = {
  connected: () => boolean
  disconnect: () => void
  reconnect: () => void
  id: () => string | undefined
}

declare global {
  interface Window {
    __kurioMock?: MockControl
    __kurioSocket?: KurioSocketBridge
  }
}

export {}
