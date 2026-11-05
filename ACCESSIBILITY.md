# Acessibilidade e contraste — Kurio

## Contraste (WCAG 2.1 AA)

Pares avaliados sobre a paleta do Figma (`#140D0A` página, `#241612` superfície):

| Foreground | Background | Razão | AA (≥ 4.5:1) |
| --- | --- | ---: | --- |
| `#B39463` (`--subtle`, placeholders) | `#241612` | **6.12:1** | Sim |
| `#B39463` | `#140D0A` | **6.72:1** | Sim |
| `#CFB28C` (`--text-muted`) | `#241612` | **8.68:1** | Sim |
| `#D28A4C` (`--brand`) | `#140D0A` | **6.85:1** | Sim |
| `#F5F1EB` (`--text`) | `#241612` | **15.57:1** | Sim |
| `#F0805F` (`--required`) | `#241612` | **6.64:1** | Sim |

Conclusão: `#B39463` sobre `#241612` **passa AA** para texto normal; não foi necessário alterar o token. Placeholders e texto terciário usam `--subtle`; corpo e labels usam `--text` / `--text-muted`.

## Práticas cobertas

- Foco visível global (`:focus-visible` em `index.css`)
- Trap de foco em `Dialog` / `Sheet` (Radix)
- Erros de formulário com `aria-invalid` + `aria-describedby` (`FormField`)
- Anúncios `aria-live` para mutations e tempo real
- Skeletons com shimmer; animação desligada em `prefers-reduced-motion`
- Estados de erro/indisponível com texto, não só cor

## Testes

- `e2e/a11y.spec.ts` — teclado, foco em diálogos/drawers, validação, overflow em 390/768/1440, zoom 200%, axe (sem violações *serious*/*critical*)
- `e2e/smoke.spec.ts` — skip link e overflow básico
