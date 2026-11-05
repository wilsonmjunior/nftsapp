import { SlidersHorizontal } from 'lucide-react'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

import { hasActiveFilters } from '../search'
import { useCatalogState } from '../use-catalog-state'
import { CatalogFilters } from './catalog-filters'
import { CatalogSearchInput } from './catalog-search-input'
import { SortSelect } from './sort-select'

/** Busca e botão de filtros no topo do Início em telas sem a sidebar (como no layout mobile). */
export function CatalogQuickBar() {
  const { search, query, update, clear, commitQuery } = useCatalogState()
  const active = hasActiveFilters(search)

  return (
    <div className="page-container flex gap-3 pt-6 pb-4 lg:hidden">
      <CatalogSearchInput id="busca-catalogo-compacta" value={search.q} onCommit={commitQuery} className="flex-1" />
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={active ? 'Filtros e ordenação (filtros ativos)' : 'Filtros e ordenação'}
            className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-linear-to-b from-[#8a5a33] to-brand text-foreground md:size-10 md:rounded-md"
          >
            <SlidersHorizontal className="size-5" aria-hidden="true" />
            {active && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-foreground" />}
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(100vw,360px)] gap-0 overflow-y-auto bg-surface p-6">
          <SheetHeader className="mb-6 p-0">
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription aria-live="polite">
              {query.data ? `${query.data.total} NFTs com os filtros atuais.` : 'Carregando resultados…'}
            </SheetDescription>
          </SheetHeader>
          <div className="mb-9">
            <SortSelect value={search.sort} onChange={(sort) => update({ sort })} />
          </div>
          <CatalogFilters search={search} facets={query.data?.facets} onChange={update} onClear={clear} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
