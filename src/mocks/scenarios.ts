import { HttpResponse } from 'msw'

import { env } from '@/env'

import { createRandom } from './random'

export const SCENARIO_NAMES = [
  'default',
  'fast',
  'slow',
  'jitter',
  'out-of-order',
  'offline',
  'server-error',
  'flaky',
  'empty',
  'session-expired',
  'price-change',
  'sold-out',
  'order-timeout',
  'payment-declined',
] as const

export type ScenarioName = (typeof SCENARIO_NAMES)[number]

export type RequestContext = {
  endpoint: string
  index: number
  random: () => number
}

type Scenario = {
  label: string
  description: string
  latency: (context: RequestContext) => number
  intercept?: (context: RequestContext) => Response | undefined
  emptyCatalog?: boolean
  sessionTtlMs?: number
  checkout?: 'price-change' | 'sold-out' | 'timeout'
  paymentOutcome?: 'confirmed' | 'declined'
}

const between = (min: number, max: number) => (context: RequestContext) => Math.round(min + context.random() * (max - min))

const transientError = (status: number, message: string) =>
  HttpResponse.json({ error: { code: status >= 500 ? 'TRANSIENT' : 'INTERNAL', message } }, { status })

export const SCENARIOS: Record<ScenarioName, Scenario> = {
  default: { label: 'Padrão', description: 'Latência realista entre 120 e 450 ms.', latency: between(120, 450) },
  fast: { label: 'Sem latência', description: 'Respostas imediatas (usado nos testes).', latency: () => 0 },
  slow: { label: 'Lento', description: 'Todas as respostas levam 2,5 s.', latency: () => 2500 },
  jitter: { label: 'Latência variável', description: 'Entre 100 ms e 2,5 s, com seed reproduzível.', latency: between(100, 2500) },
  'out-of-order': {
    label: 'Respostas fora de ordem',
    description: 'No catálogo, requisições pares demoram 1,8 s e ímpares 150 ms.',
    latency: (context) => (context.endpoint === 'nfts.list' ? (context.index % 2 === 0 ? 1800 : 150) : 150),
  },
  offline: {
    label: 'Sem conexão',
    description: 'Todas as requisições falham na rede.',
    latency: () => 300,
    intercept: () => HttpResponse.error(),
  },
  'server-error': {
    label: 'Erro 500',
    description: 'A API responde 500 em todas as rotas.',
    latency: () => 200,
    intercept: () => transientError(500, 'Erro interno simulado.'),
  },
  flaky: {
    label: 'Instável',
    description: 'A primeira chamada de cada endpoint falha com 503; as seguintes funcionam.',
    latency: between(120, 300),
    intercept: (context) => (context.index === 0 ? transientError(503, 'Serviço temporariamente indisponível.') : undefined),
  },
  empty: { label: 'Catálogo vazio', description: 'A busca de NFTs não retorna resultados.', latency: between(120, 300), emptyCatalog: true },
  'session-expired': {
    label: 'Sessão curta',
    description: 'Novas sessões expiram em 30 s.',
    latency: between(120, 300),
    sessionTtlMs: 30_000,
  },
  'price-change': {
    label: 'Preço alterado no checkout',
    description: 'No primeiro envio do pedido, o preço do primeiro item sobe 0.1 ETH.',
    latency: between(120, 300),
    checkout: 'price-change',
  },
  'sold-out': {
    label: 'Edição esgotada no checkout',
    description: 'No primeiro envio do pedido, a edição do primeiro item esgota.',
    latency: between(120, 300),
    checkout: 'sold-out',
  },
  'order-timeout': {
    label: 'Timeout após criar o pedido',
    description: 'O primeiro envio cria o pedido mas responde depois do timeout do cliente.',
    latency: between(120, 300),
    checkout: 'timeout',
  },
  'payment-declined': {
    label: 'Pagamento recusado',
    description: 'Os pedidos terminam recusados.',
    latency: between(120, 300),
    paymentOutcome: 'declined',
  },
}

const STORAGE_KEY = 'kurio:mock-scenario'
const SEED_KEY = 'kurio:mock-seed'

function isScenario(value: string | null | undefined): value is ScenarioName {
  return !!value && (SCENARIO_NAMES as readonly string[]).includes(value)
}

function initialScenario(): ScenarioName {
  const fromUrl = new URLSearchParams(window.location.search).get('scenario')
  if (isScenario(fromUrl)) {
    sessionStorage.setItem(STORAGE_KEY, fromUrl)
    return fromUrl
  }
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (isScenario(stored)) return stored
  return isScenario(env.VITE_MOCK_SCENARIO) ? env.VITE_MOCK_SCENARIO : 'default'
}

function initialSeed() {
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'))
  if (Number.isInteger(fromUrl) && fromUrl > 0) {
    sessionStorage.setItem(SEED_KEY, String(fromUrl))
    return fromUrl
  }
  return Number(sessionStorage.getItem(SEED_KEY)) || 1
}

let current: ScenarioName = initialScenario()
let seed = initialSeed()
let random = createRandom(seed)
let counters = new Map<string, number>()
const injectedFailures = new Map<string, { status: number; remaining: number }>()

export const scenario = {
  get name() {
    return current
  },
  get config() {
    return SCENARIOS[current]
  },
  get seed() {
    return seed
  },

  set(name: ScenarioName, nextSeed = seed) {
    current = name
    seed = nextSeed
    sessionStorage.setItem(STORAGE_KEY, name)
    sessionStorage.setItem(SEED_KEY, String(seed))
    random = createRandom(seed)
    counters = new Map()
  },

  /** Faz as próximas `times` chamadas do endpoint falharem, sem trocar o cenário. Status 0 simula queda de rede. */
  failNext(endpoint: string, { status = 500, times = 1 }: { status?: number; times?: number } = {}) {
    injectedFailures.set(endpoint, { status, remaining: times })
  },

  takeInjectedFailure(endpoint: string): Response | undefined {
    const failure = injectedFailures.get(endpoint)
    if (!failure) return undefined
    failure.remaining -= 1
    if (failure.remaining <= 0) injectedFailures.delete(endpoint)
    if (failure.status === 0) return HttpResponse.error()
    return transientError(failure.status, 'Falha simulada pelo painel de mocks.')
  },

  nextContext(endpoint: string): RequestContext {
    const index = counters.get(endpoint) ?? 0
    counters.set(endpoint, index + 1)
    return { endpoint, index, random: random.next }
  },
}
