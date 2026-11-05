import { toEthString, eth } from '@/lib/eth'

import { settleDueOrders } from './db/domain'
import { db } from './db/store'
import {
  connectedClientCount,
  getLastBroadcast,
  rebroadcastNft,
  rebroadcastOrder,
  rebroadcastStaleNft,
} from './realtime-hub'
import { SCENARIO_NAMES, SCENARIOS, scenario, type ScenarioName } from './scenarios'

const SETTLE_INTERVAL_MS = 500

export type NftPatch = {
  /** Edição alvo; sem ela, a mudança vale para todas. */
  editionId?: string
  price?: string
  available?: number
}

export const mockControl = {
  scenarios: SCENARIO_NAMES.map((name) => ({ name, label: SCENARIOS[name].label, description: SCENARIOS[name].description })),

  getScenario: () => ({ name: scenario.name, seed: scenario.seed }),

  setScenario(name: ScenarioName, seed?: number) {
    scenario.set(name, seed)
  },

  /** Restaura o banco para a seed. Não mexe em sessão nem carrinho do visitante no cliente. */
  reset() {
    db.reset()
  },

  failNext: (endpoint: string, options?: { status?: number; times?: number }) => scenario.failNext(endpoint, options),

  expireSessions() {
    db.mutate((state) => {
      const past = new Date(Date.now() - 1000).toISOString()
      for (const session of state.sessions) session.expiresAt = past
    })
  },

  updateNft(nftId: string, patch: NftPatch) {
    db.mutate(
      (state) => {
        const nft = state.nfts.find((item) => item.id === nftId)
        if (!nft) throw new Error(`NFT ${nftId} não existe`)
        for (const edition of nft.editions) {
          if (patch.editionId && edition.id !== patch.editionId) continue
          if (patch.price !== undefined) edition.price = toEthString(eth(patch.price))
          if (patch.available !== undefined) edition.available = patch.available
        }
        nft.version += 1
      },
      [{ type: 'nft.updated', nftId }],
    )
  },

  settleOrders: () => settleDueOrders(Date.now() + 60_000),

  /** Reemite `nft.updated` da versão atual (mesmo eventId → cliente deve deduplicar). */
  rebroadcastNft,

  /** Emite `nft.updated` com versão antiga (cliente deve descartar). */
  rebroadcastStaleNft,

  rebroadcastOrder,

  socketClients: () => connectedClientCount(),
  lastBroadcast: () => getLastBroadcast(),

  snapshot: () => structuredClone(db.state),
}

export type MockControl = typeof mockControl

declare global {
  interface Window {
    __kurioMock?: MockControl
  }
}

export function startMockRuntime() {
  window.__kurioMock = mockControl
  settleDueOrders()
  window.setInterval(() => settleDueOrders(), SETTLE_INTERVAL_MS)
}
