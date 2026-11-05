type GoogleAuthResponse = {
  token: string
  session: {
    user: {
      id: string
      username: string
      displayName: string
      email: string
      avatarUrl: string | null
      ensName: string | null
      walletNickname: string | null
    }
    expiresAt: string
  }
}

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
  createGoogleIdToken(claims: {
    email: string
    name?: string
    picture?: string
    sub?: string
    expiresInSec?: number
  }): string
  googleSignIn(profile: { email: string; name?: string; picture?: string; sub?: string }): GoogleAuthResponse
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
