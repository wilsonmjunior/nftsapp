import { expect, test as base, type Locator, type Page } from '@playwright/test'

/** Cenários do mock (`src/mocks/scenarios.ts`). */
export type ScenarioName =
  | 'default'
  | 'fast'
  | 'slow'
  | 'jitter'
  | 'out-of-order'
  | 'offline'
  | 'server-error'
  | 'flaky'
  | 'empty'
  | 'session-expired'
  | 'price-change'
  | 'sold-out'
  | 'order-timeout'
  | 'payment-declined'

export const DEMO_USERS = {
  nova: { email: 'nova@kurio.dev', password: 'Kurio@123', displayName: 'Nova Sato' },
  leo: { email: 'leo@kurio.dev', password: 'Kurio@123', displayName: 'Leo Martins' },
} as const

export type DemoUser = keyof typeof DEMO_USERS

/** Instante congelado nos testes sensíveis a tempo / regressão visual. */
export const FROZEN_NOW = new Date('2026-11-04T15:00:00.000Z')

const CLIENT_STORAGE_PREFIX = 'kurio:'
const MOCK_DB_KEY = 'kurio:mock-db'

async function clearClientStorage(page: Page) {
  await page.evaluate(
    ({ prefix, keep }) => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(prefix) && key !== keep) localStorage.removeItem(key)
      }
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith(prefix) && !key.startsWith('kurio:mock-')) sessionStorage.removeItem(key)
      }
    },
    { prefix: CLIENT_STORAGE_PREFIX, keep: MOCK_DB_KEY },
  )
}

async function waitForMock(page: Page) {
  await expect.poll(async () => page.evaluate(() => Boolean(window.__kurioMock))).toBe(true)
}

export type KurioHelpers = {
  scenario: ScenarioName
  /** Garante MSW no ar, aplica cenário, reseta o banco e limpa storage do cliente. */
  reset: (overrides?: { scenario?: ScenarioName }) => Promise<void>
  setScenario: (name: ScenarioName, seed?: number) => Promise<void>
  goto: (path: string, options?: { scenario?: ScenarioName; waitForHeading?: boolean }) => Promise<void>
  loginAs: (user: DemoUser, redirect?: string, scenario?: ScenarioName) => Promise<void>
  loginAsNova: (redirect?: string, scenario?: ScenarioName) => Promise<void>
  /**
   * Congela Date/timers no browser. Chamar antes de `reset`/`goto` quando a UI
   * usa `setInterval` (hero) ou TTL de sessão.
   */
  installClock: (at?: Date) => Promise<void>
  /** Avança o relógio instalado (ms ou string estilo Playwright, ex. `'00:00:30'`). */
  fastForward: (duration: number | string) => Promise<void>
  /** Dispara mutação no mock; eventos saem pelo hub Socket.IO / handlers MSW. */
  updateNft: (
    nftId: string,
    patch: { editionId?: string; price?: string; available?: number },
  ) => Promise<void>
  settleOrders: () => Promise<void>
  expireSessions: () => Promise<void>
  failNext: (endpoint: string, options?: { status?: number; times?: number }) => Promise<void>
  /** Estabiliza a página para screenshot (esconde painel de mocks / toasts / caret). */
  prepareVisualPage: () => Promise<void>
  visualMasks: () => Locator[]
}

type KurioFixtures = {
  /** Cenário padrão; sobrescreva com `test.use({ scenario: 'slow' })`. */
  scenario: ScenarioName
  kurio: KurioHelpers
}

export const test = base.extend<KurioFixtures>({
  scenario: ['fast', { option: true }],

  kurio: async ({ page, scenario }, use) => {
    let clockInstalled = false

    /** MSW `delay()` usa timers; com clock pausado é preciso avançar para as respostas chegarem. */
    async function flushNetworkTimers(ms = 50) {
      if (!clockInstalled) return
      await page.clock.runFor(ms)
    }

    const helpers: KurioHelpers = {
      scenario,

      async installClock(at = FROZEN_NOW) {
        await page.clock.install({ time: at })
        clockInstalled = true
      },

      async fastForward(duration) {
        await page.clock.fastForward(duration)
      },

      async setScenario(name, seed) {
        await waitForMock(page)
        await page.evaluate(
          ({ name: next, seed: nextSeed }) => {
            window.__kurioMock!.setScenario(next as never, nextSeed)
          },
          { name, seed },
        )
      },

      async reset(overrides) {
        const next = overrides?.scenario ?? scenario
        await page.goto(`/?scenario=${encodeURIComponent(next)}`)
        await flushNetworkTimers()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await waitForMock(page)
        await page.evaluate(() => window.__kurioMock!.reset())
        await clearClientStorage(page)
        await flushNetworkTimers()
      },

      async goto(path, options) {
        const next = options?.scenario ?? scenario
        const separator = path.includes('?') ? '&' : '?'
        await page.goto(`${path}${separator}scenario=${encodeURIComponent(next)}`)
        await flushNetworkTimers()
        if (options?.waitForHeading !== false) {
          await expect(page.getByRole('main')).toBeVisible()
        }
      },

      async loginAs(user, redirect = '/', loginScenario) {
        const credentials = DEMO_USERS[user]
        const next = loginScenario ?? scenario
        await page.goto(
          `/login?redirect=${encodeURIComponent(redirect)}&scenario=${encodeURIComponent(next)}`,
        )
        await flushNetworkTimers()
        await page.getByPlaceholder('contato@email.com').fill(credentials.email)
        await page.getByPlaceholder('Senha', { exact: true }).fill(credentials.password)
        await page.getByRole('button', { name: 'Entrar', exact: true }).click()
        if (clockInstalled) {
          // Avança timers do MSW até a navegação pós-login (cenário fast ≈ delay 0).
          for (let i = 0; i < 40; i += 1) {
            await page.clock.runFor(50)
            if (!page.url().includes('/login')) break
          }
        }
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 })
      },

      async loginAsNova(redirect = '/', loginScenario) {
        await helpers.loginAs('nova', redirect, loginScenario)
      },

      async updateNft(nftId, patch) {
        await waitForMock(page)
        await page.evaluate(({ id, next }) => window.__kurioMock!.updateNft(id, next), {
          id: nftId,
          next: patch,
        })
      },

      async settleOrders() {
        await waitForMock(page)
        await page.evaluate(() => window.__kurioMock!.settleOrders())
      },

      async expireSessions() {
        await waitForMock(page)
        await page.evaluate(() => window.__kurioMock!.expireSessions())
      },

      async failNext(endpoint, options) {
        await waitForMock(page)
        await page.evaluate(
          ({ name, opts }) => window.__kurioMock!.failNext(name, opts),
          { name: endpoint, opts: options },
        )
      },

      visualMasks() {
        return [
          page.getByRole('button', { name: /Painel de mocks/i }),
          page.locator('[data-sonner-toaster]'),
        ]
      },

      async prepareVisualPage() {
        await page.addStyleTag({
          content: `
            [aria-label^="Painel de mocks"] { visibility: hidden !important; }
            [data-sonner-toaster] { display: none !important; }
            *, *::before, *::after {
              caret-color: transparent !important;
              transition-duration: 0s !important;
              animation-duration: 0s !important;
              animation-delay: 0s !important;
            }
          `,
        })
      },
    }

    await use(helpers)
  },
})

export { expect }
