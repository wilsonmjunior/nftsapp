# Arquitetura — Kurio

## Visão geral

SPA Vite que **não depende de backend real**. REST e WebSocket são simulados no browser:

- **MSW v2** intercepta `VITE_API_URL` (`https://api.mktnft.mock`).
- **`@mswjs/socket.io-binding`** emula Socket.IO na origem da página (o client força `transports: ['websocket']` porque o binding não cobre polling).
- Estado mutável em `src/mocks/db` (seed + `localStorage` `kurio:mock-db`), controlado por `window.__kurioMock`.

```
UI (features/*) → Axios / Socket.IO client
       ↓                    ↓
  MSW handlers      realtime-hub (broadcast)
       ↓                    ↓
     db/store ←── scenarios (latência, falhas, checkout)
```

## Contratos REST

Schemas Zod em `src/api/contracts/` (auth, account, nft, commerce, events, common). Handlers em `src/mocks/handlers/`.

Principais grupos:

| Área | Exemplos |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/session`, `POST /auth/logout` |
| Catálogo | `GET /nfts`, `GET /nfts/:id`, featured |
| Favoritos | add/remove com atualização otimista no client |
| Carrinho | CRUD autenticado + `POST` merge do visitante |
| Quote / cupom | totais, taxas, desconto |
| Pedidos | `POST /orders` (Idempotency-Key), `GET /orders/:id` |
| Conta | perfil, avatar, senha, carteiras |

Erros padronizados (`code`, `message`, campos); o client mapeia em `toApiError` (transiente vs 4xx).

## Eventos em tempo real

Contratos em `src/api/contracts/events.ts`:

- `nft.updated` — `eventId`, `version`, preço/edições/disponibilidade
- `order.updated` — status, `userId` (client ignora outros usuários), tx hash

Pipeline no client (`features/realtime/`):

1. Conecta só com sessão (`RealtimeSync`).
2. Deduplica por `eventId`; descarta `version` antiga.
3. Aplica patch no cache TanStack Query; anuncia via `aria-live` / toast.
4. Na reconexão, invalida carrinho, quote e detalhe.

Disparo nos testes: `__kurioMock.updateNft` / `rebroadcastNft` / `settleOrders` → hub MSW.

## Sessão

- Token em `localStorage` (`kurio:session-token`); hash de senha só no mock.
- Login/cadastro: modal desktop (`?auth=`) ou páginas `/login` / `/cadastro`; `?redirect=` só caminhos internos.
- Guards: `beforeLoad` + `staticData.requiresAuth`.
- Queries privadas: `privateKey(userId, …)` — logout / troca de usuário / 401 limpam o escopo.
- 401 com o token atual abre o modal sem desmontar a rota (formulário de checkout preservado).

## Carrinho

- **Visitante**: linhas em `localStorage` (`kurio:guest-cart`).
- **Autenticado**: API; no login, `mergeGuestCart` envia o visitante e limpa o storage.
- Eventos `nft.updated` atualizam preços/disponibilidade no carrinho e na quote.

## Cache e retries

- TanStack Query: `staleTime` 30s; retry só em erros transientes (rede / 5xx), máx. 2.
- Lista do catálogo: `placeholderData: keepPreviousData` + `signal` para cancelar buscas obsoletas.
- Checkout/quote: `retry: false` onde a idempotência e o feedback explícito importam.
- Axios espera `mocksReady` antes de ir à rede (UI/hero podem pintar enquanto o worker MSW sobe).

## Limitações do binding Socket.IO

- Apenas transporte **websocket** (sem long-polling).
- Sem namespaces / rooms — broadcast global filtrado no client por `userId` / recurso.
- MSW permanece na **v2** enquanto o binding não suportar v3.
- Hosts cruzados falhariam DNS; com mocks, `resolveSocketUrl()` usa `window.location.origin`.

## Desvios e decisões vs Figma / enunciado

| Tema | Decisão |
| --- | --- |
| Fonte | Roboto Mono self-hosted (woff2 latin), alinhada ao visual monoespaçado |
| Auth desktop | Modal sobre a página + URLs `/login` e `/cadastro` |
| Header autenticado | Menu da conta (Figma só mostrava “Entrar”) |
| Busca desktop | Campo no topo da sidebar; lupa do header foca esse input |
| Preço riscado | Exibido quando a API manda `originalPrice` |
| BottomNav centro | “Explorar” → foco/busca (scan fora do escopo) |
| Pagamento | Rota `/pagamento` (não `/checkout`); formulário pré-preenchido do perfil/carteira |
| Perfil mobile | Shell com tabs + “Mais opções”; itens fora do escopo via `UnavailableAction` |
| Confirmação | Estados pendente / confirmado / recusado; Etherscan marcado como link simulado |
| Tokens / totais | Sempre da API (Figma tinha IDs e somas inconsistentes) |
| Viewport mobile | Avaliação em **390**; frames Figma em 414 |

## Mapa de pastas (alto nível)

```
src/
  api/           # clients Axios + contratos Zod
  components/    # shell, UI shadcn, a11y
  features/      # session, catalog, cart, checkout, orders, account, realtime, home
  mocks/         # MSW, db, scenarios, painel, runtime
  routes/        # TanStack file routes + head/SEO
  lib/           # http, socket, query-client, eth
```

## Testes e qualidade

- E2E Playwright cobrindo os 12 fluxos do enunciado + `e2e/a11y.spec.ts` + `e2e/visual.spec.ts`.
- Fixture `e2e/fixtures.ts` (reset, cenário, clock, disparo de mock).
- Acessibilidade: `ACCESSIBILITY.md`; performance: `PERFORMANCE.md` + `lighthouserc.cjs`.
