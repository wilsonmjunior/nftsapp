import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Até 4 páginas em sequência (como no layout), com primeira e última sempre alcançáveis. */
function pageWindow(page: number, totalPages: number): Array<number | 'gap'> {
  const size = 4
  let start = Math.max(1, Math.min(page - 1, totalPages - size + 1))
  const end = Math.min(totalPages, start + size - 1)
  start = Math.max(1, end - size + 1)

  const pages: Array<number | 'gap'> = []
  if (start > 1) pages.push(1, ...(start > 2 ? (['gap'] as const) : []))
  for (let value = start; value <= end; value++) pages.push(value)
  if (end < totalPages) pages.push(...(end < totalPages - 1 ? (['gap'] as const) : []), totalPages)
  return pages
}

const item = 'grid size-8 place-items-center rounded-sm border border-border text-sm transition-colors hover:border-brand'

export function CatalogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null

  const pageLink = (target: number) => ({
    to: '/' as const,
    search: (prev: Record<string, unknown>) => ({ ...prev, page: target === 1 ? undefined : target }),
    hash: 'catalogo',
  })

  return (
    <nav aria-label="Paginação do catálogo" className="mt-12 flex justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <Link {...pageLink(page - 1)} aria-label="Página anterior" className={item}>
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Link>
          </li>
        )}
        {pageWindow(page, totalPages).map((value, index) =>
          value === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={value}>
              <Link
                {...pageLink(value)}
                aria-label={`Página ${value}`}
                aria-current={value === page ? 'page' : undefined}
                className={cn(item, value === page && 'border-brand bg-brand font-bold text-primary-foreground')}
              >
                {value}
              </Link>
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <Link {...pageLink(page + 1)} aria-label="Próxima página" className={item}>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
