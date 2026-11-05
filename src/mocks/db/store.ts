import { createSeedState, SCHEMA_VERSION } from '../fixtures'
import type { DbState } from './types'

const STORAGE_KEY = 'kurio:mock-db'

export type DbChange =
  | { type: 'nft.updated'; nftId: string }
  | { type: 'order.updated'; orderId: string }

type ChangeListener = (change: DbChange) => void

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.schemaVersion === SCHEMA_VERSION) return parsed
    }
  } catch {
    // Estado corrompido ou storage indisponível: volta para a seed.
  }
  return createSeedState()
}

let state = load()
const listeners = new Set<ChangeListener>()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Sem storage o mock segue em memória.
  }
}

export const db = {
  /** Leitura do estado atual. Não altere o objeto retornado fora de `mutate`. */
  get state(): Readonly<DbState> {
    return state
  },

  /** Aplica uma mudança, persiste e emite os eventos informados. */
  mutate<T>(recipe: (draft: DbState) => T, changes: DbChange[] = []): T {
    const result = recipe(state)
    persist()
    changes.forEach((change) => listeners.forEach((listener) => listener(change)))
    return result
  },

  nextId(prefix: string) {
    state.sequence += 1
    return `${prefix}_${state.sequence}`
  },

  reset() {
    state = createSeedState()
    persist()
  },

  subscribe(listener: ChangeListener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

persist()
