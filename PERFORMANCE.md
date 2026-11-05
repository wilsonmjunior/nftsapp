# Performance e Lighthouse — Kurio

## Ambiente

| Item | Valor |
| --- | --- |
| Comando | `npm run lighthouse` (`VITE_MOCK_PANEL=false` no build) |
| Build | `vite build` + preview em `http://localhost:4173` |
| Cenário | `?scenario=fast` (latência MSW = 0; UI/assets intactos) |
| Coletas | 3 runs × Início + Detalhe (`emerald-ape-042`) × mobile + desktop |
| Agregação | mediana por URL/perfil (`scripts/summarize-lighthouse.mjs`) |
| Config | `lighthouserc.cjs` |
| Relatórios | `lighthouse/{mobile,desktop}/*-report.{html,json}` + `lighthouse/summary.json` |

Versões no momento da medição: Node (local), `@lhci/cli` ^0.16, Lighthouse embutido no LHCI.

## Metas do enunciado

| Categoria | Meta | Mobile (mediana) | Desktop (mediana) |
| --- | ---: | ---: | ---: |
| Performance | ≥ 90 | **79** / **78** (início / detalhe) | **98** / **98** |
| Accessibility | ≥ 95 | **100** / **100** | **100** / **100** |
| Best Practices | ≥ 95 | **96** / **96** | **96** / **96** |
| SEO | ≥ 90 | **100** / **100** | **100** / **100** |

### Core Web Vitals (mediana)

| Página | Perfil | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: |
| `/` | mobile | ~5.8 s | 0 | ~33 ms |
| `/nfts/emerald-ape-042` | mobile | ~5.8 s | ~0.001 | ~86 ms |
| `/` | desktop | ~1.15 s | 0 | 0 ms |
| `/nfts/emerald-ape-042` | desktop | ~1.19 s | 0 | 0 ms |

## O que já está otimizado

- Code splitting por rota (TanStack Router / Vite)
- Imagens AVIF + WebP responsivas (`NftImage`), `width`/`height` para CLS
- Fontes Roboto Mono latin woff2 com `font-display: swap`
- Preload do LCP do hero + shell HTML estático até o React montar
- MSW sobe em paralelo à UI; Axios/Socket aguardam `mocksReady` (hero estático pinta antes da API)
- `lang="pt-BR"`, `meta description`, titles por rota (`HeadContent`), `robots.txt`
- Skeletons com dimensões reservadas (CLS ~ 0)

## Por que o Performance mobile fica abaixo de 90

O LCP mediano (~5.8 s) no perfil mobile (throttling 4G lenta + CPU 4×) ocorre **depois** do parse/execução do bundle principal e da ativação do worker MSW (~438 KiB minificados em `browser-*.js`). O elemento LCP é a imagem do hero/galeria inserida pelo React; mesmo com preload e shell HTML, a pintura “definitiva” via SPA atualiza o LCP para o instante da hidratação.

Não simplificamos a entrega para pontuar (mocks, Socket.IO e catálogo permanecem ativos). No desktop (sem throttling agressivo) a mediana de Performance é **98**.

Mitigações já aplicadas: boot paralelo do MSW, preload AVIF, shell LCP, hero como candidato a LCP (sem `priority` nos cards). Ganho adicional exigiria SSR/streaming ou mocks fora do critical path do browser — fora do escopo do binding MSW no cliente.

A asserção LHCI de Performance é `warn` (não falha o autorun); Accessibility, Best Practices e SEO continuam `error` ≥ meta.
