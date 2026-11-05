# Kurio (`mktnft-app`)

Marketplace de NFTs do desafio de frontend: catálogo, favoritos, carrinho, checkout com carteira simulada, perfil e tempo real — tudo com **MSW + Socket.IO mockados no browser** (sem backend).

Stack: React 19, TypeScript, Vite, TanStack Router/Query, Axios, Socket.IO, Zod, RHF, Tailwind, shadcn/ui, MSW, Playwright, Lighthouse CI.

Documentação complementar: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`ACCESSIBILITY.md`](./ACCESSIBILITY.md) · [`PERFORMANCE.md`](./PERFORMANCE.md)

## Requisitos

- Node **24+**
- Chromium do Playwright (só para E2E): `npx playwright install chromium`

## Setup

```sh
npm install
cp .env.example .env   # se ainda não existir
npm run dev
```

Abre `http://localhost:5173`. Os mocks já vêm ligados no `.env`.

### Variáveis de ambiente

| Variável | Padrão | Função |
| --- | --- | --- |
| `VITE_API_URL` | `https://api.mktnft.mock` | Base URL REST (interceptada pelo MSW) |
| `VITE_SOCKET_URL` | `https://realtime.mktnft.mock` | URL Socket.IO (com mocks, o client usa a origem da página) |
| `VITE_ENABLE_MOCKS` | `true` | Liga MSW + runtime `__kurioMock` |
| `VITE_MOCK_SCENARIO` | _(vazio → `default`)_ | Cenário inicial; `?scenario=` na URL tem prioridade |
| `VITE_MOCK_PANEL` | `true` | Painel flutuante para trocar cenário / reset / expirar sessão |

Na Vercel, defina as mesmas `VITE_*` no build (Vite embute no bundle).

## Credenciais de demo

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Nova Sato | `nova@kurio.dev` | `Kurio@123` |
| Leo Martins | `leo@kurio.dev` | `Kurio@456` |

Cupom de exemplo na seed: `KURIO10` (quando aplicável ao carrinho autenticado).

## Cenários de mock

Troca pelo painel (ícone de frasco) ou pela URL: `/?scenario=slow`.

| Cenário | Efeito |
| --- | --- |
| `default` | Latência 120–450 ms |
| `fast` | Sem latência (E2E / Lighthouse) |
| `slow` | 2,5 s em todas as respostas |
| `jitter` | Latência variável com seed |
| `out-of-order` | Catálogo: respostas fora de ordem |
| `offline` | Falha de rede |
| `server-error` | HTTP 500 |
| `flaky` | Primeira chamada de cada endpoint → 503 |
| `empty` | Catálogo vazio |
| `session-expired` | Sessões com TTL de 30 s |
| `price-change` | Checkout: preço sobe no primeiro POST |
| `sold-out` | Checkout: edição esgota no primeiro POST |
| `order-timeout` | Pedido criado, resposta após timeout do client |
| `payment-declined` | Pedidos terminam recusados |

### Reset e falhas pontuais

- **Painel → Restaurar seed**: `mockControl.reset()` + limpa storage `kurio:*` (exceto o DB mock) e recarrega.
- **Expirar sessões**: força 401 na próxima request autenticada.
- Console / E2E: `window.__kurioMock.reset()`, `.setScenario(name)`, `.failNext(endpoint, { status, times })`, `.updateNft(...)`, `.settleOrders()`, `.expireSessions()`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Vite + HMR |
| `npm run build` / `npm run preview` | Build de produção e preview (`:4173` nos testes) |
| `npm run typecheck` / `npm run lint` | TypeScript e oxlint |
| `npm run images` | Regenera AVIF/WebP em `public/nfts/` |
| `npm run test:e2e` | Playwright (desktop 1440 + mobile 390) |
| `npm run test:e2e:update` | Atualiza baselines visuais |
| `npm run test:e2e:report` | Abre o HTML report |
| `npm run lighthouse` | Build sem painel + LHCI mobile/desktop + `summary.json` |
| `npm run lighthouse:report` | Mediana LCP/CLS/TBT a partir dos JSON em `lighthouse/` |

Fixture compartilhada: `e2e/fixtures.ts` (`kurio.reset`, `installClock`, `loginAsNova`, …).

## Reprodução de falhas

1. Abra o app com o cenário desejado (`?scenario=flaky` ou painel).
2. Para falha única: no console, `__kurioMock.failNext('nfts.list', { status: 503 })` e dispare a ação (filtro, refetch).
3. Tempo real: autentique-se, espere `__kurioSocket.connected() === true`, então `__kurioMock.updateNft('emerald-ape-042', { price: '1.45' })`.
4. E2E isolado: `npx playwright test e2e/catalog.spec.ts --project=desktop-chromium`.
5. Trace de falha: `npx playwright show-trace test-results/.../trace.zip`.

## Deploy (Vercel)

- Produção: **https://kurio-mktnft.vercel.app**
- `vercel.json` faz rewrite SPA (`/*` → `index.html`, preservando arquivos estáticos).
- Framework preset: Vite · output `dist` · build `npm run build`.
- Env de build: `VITE_ENABLE_MOCKS=true` e URLs mock acima.
- Com mocks no client, **não** há API na Vercel — o worker MSW sobe no browser após o load.

## Rotas principais

| Rota | Acesso |
| --- | --- |
| `/` | Público (catálogo + search params) |
| `/nfts/$nftId` | Público |
| `/carrinho` | Público (visitante em `localStorage`) |
| `/pagamento` | Autenticado |
| `/pedidos/$orderId` | Autenticado (dono) |
| `/login`, `/cadastro` | Visitante |
| `/perfil`, `/perfil/carteiras` | Autenticado |
| `/favoritos` | Autenticado |
