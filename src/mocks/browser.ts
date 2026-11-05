import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'
import { startMockRuntime } from './runtime'

export const worker = setupWorker(...handlers)

export async function startMocks() {
  await worker.start({ onUnhandledRequest: 'bypass', quiet: !import.meta.env.DEV })
  startMockRuntime()
}
