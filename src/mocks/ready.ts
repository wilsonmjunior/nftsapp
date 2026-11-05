import { env } from '@/env'

let resolveReady: (() => void) | undefined

/**
 * Resolvido quando o MSW (e o runtime de mock) está pronto para interceptar.
 * Sem mocks, resolve imediatamente.
 */
export const mocksReady: Promise<void> = env.VITE_ENABLE_MOCKS
  ? new Promise<void>((resolve) => {
      resolveReady = resolve
    })
  : Promise.resolve()

export function markMocksReady() {
  resolveReady?.()
  resolveReady = undefined
}
