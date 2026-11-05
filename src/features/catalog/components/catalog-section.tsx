import type { UseQueryResult } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { cn } from 'cn'
import { RotateCw, SearchX } from 'lucide-react'
import { useEffect } from 'react'

import { NFT_PAGE_SIZE, type NftListResponse } from '@/api/contracts'
import { Button } from '@/components/ui/button'

import { hasActiveFilters, SEARCH_INPUT_ID, TAB_LABELS, type CatalogSearch } from '../search'
import { CLEARED_FILTERS, useCatalogState } from '../use-catalog-state'
import { CatalogFilters } from './catalog-filters'
import { CatalogPagination } from './catalog-pagination'
import { CatalogSearchInput } from './catalog-search-input'
import { FeaturedNft } from './featured-nft'
import { NftCard, NftCardSkeleton } from './nft-card'
import { SortSelect } from './sort-select'

export function CatalogSection() {
  const { search, query, update, clear, commitQuery } = useCatalogState()
  const { hash } = useLocation()

  useEffect(() => {
    if (hash !== SEARCH_INPUT_ID) return
    // Há um campo na sidebar (desktop) e outro na barra do mobile; foca o que estiver visível.
    const inputs = document.querySelectorAll<HTMLInputElement>('[data-catalog-search]')
    ;[...inputs].find((input) => input.offsetParent !== null)?.focus()
  }, [hash])

  const filters = <CatalogFilters search={search} facets={query.data?.facets} onChange={update} onClear={clear} />

  return (
    <section id="catalogo" aria-labelledby="catalogo-title" className="page-container scroll-mt-6 pt-8 md:pt-12">
      <h2 id="catalogo-title" className="sr-only">
        Catálogo de NFTs
      </h2>

      <div className="grid gap-10 lg:grid-cols-[310px_1fr] lg:gap-12">
        <aside aria-label="Filtros" className="hidden lg:grid lg:content-start lg:gap-6">
          <CatalogSearchInput id="busca-catalogo" value={search.q} onCommit={commitQuery} />
          <div className="rounded-md bg-surface px-5 py-6">{filters}</div>
          <FeaturedNft />
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <nav aria-label="Seções do catálogo" className="-mx-1 overflow-x-auto">
              <ul className="flex gap-3 px-1 sm:gap-5">
                {(Object.keys(TAB_LABELS) as CatalogSearch['tab'][]).map((tab) => (
                  <li key={tab}>
                    <Link
                      from="/"
                      search={(prev) => ({ ...prev, tab: tab === 'all' ? undefined : tab, page: undefined })}
                      resetScroll={false}
                      aria-current={search.tab === tab ? 'page' : undefined}
                      className={cn(
                        'block border-b-2 py-1 text-sm whitespace-nowrap transition-colors hover:text-brand-strong sm:text-base md:text-sm',
                        search.tab === tab ? 'border-brand font-bold text-brand-strong' : 'border-transparent',
                      )}
                    >
                      {TAB_LABELS[tab]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="hidden md:block">
              <SortSelect value={search.sort} onChange={(sort) => update({ sort })} />
            </div>
          </div>

          <ResultsStatus query={query} />

          {query.isError ? (
            <CatalogError message={query.error.message} onRetry={() => void query.refetch()} retrying={query.isFetching} />
          ) : !query.data ? (
            <ul aria-busy="true" aria-label="Carregando NFTs" className={gridClass}>
              {Array.from({ length: NFT_PAGE_SIZE }, (_, index) => (
                <li key={index}>
                  <NftCardSkeleton />
                </li>
              ))}
            </ul>
          ) : query.data.items.length === 0 ? (
            <EmptyCatalog
              filtered={hasActiveFilters(search) || search.tab !== 'all'}
              onClear={() => update({ ...CLEARED_FILTERS, tab: undefined })}
            />
          ) : (
            <>
              <ul
                aria-label="NFTs"
                aria-busy={query.isPlaceholderData}
                className={cn(gridClass, 'transition-opacity', query.isPlaceholderData && 'opacity-60')}
              >
                {query.data.items.map((nft) => (
                  <li key={nft.id}>
                    {/* Sem priority: o LCP da home é o hero; cards competiriam em fetch. */}
                    <NftCard nft={nft} />
                  </li>
                ))}
              </ul>
              <CatalogPagination page={query.data.page} totalPages={query.data.totalPages} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}

/** Duas colunas desencontradas no mobile (como no layout) e três a partir do tablet. */
const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-8 max-md:[&>li:nth-child(even)]:mt-8 md:grid-cols-3 md:gap-x-6 md:gap-y-12'

function ResultsStatus({ query }: { query: UseQueryResult<NftListResponse> }) {
  const { data, isPlaceholderData, isError } = query
  const message = isError
    ? ''
    : !data || isPlaceholderData
      ? 'Carregando NFTs…'
      : data.total === 0
        ? 'Nenhum NFT encontrado.'
        : `${data.total} ${data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}, página ${data.page} de ${data.totalPages}.`

  return (
    <p role="status" className="sr-only">
      {message}
    </p>
  )
}

function CatalogError({ message, onRetry, retrying }: { message: string; onRetry: () => void; retrying: boolean }) {
  return (
    <div role="alert" className="grid justify-items-center gap-4 rounded-md bg-surface px-6 py-16 text-center">
      <p className="text-lg font-bold">Não foi possível carregar os NFTs.</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Button onClick={onRetry} disabled={retrying}>
        <RotateCw className={cn(retrying && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
        {retrying ? 'Tentando de novo…' : 'Tentar novamente'}
      </Button>
    </div>
  )
}

function EmptyCatalog({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="grid justify-items-center gap-4 rounded-md bg-surface px-6 py-16 text-center">
      <SearchX className="size-10 text-muted-foreground" aria-hidden="true" />
      <p className="text-lg font-bold">Nenhum NFT encontrado.</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {filtered
          ? 'Nenhum resultado combina com a busca e os filtros escolhidos. Tente remover algum deles.'
          : 'Ainda não há NFTs listados no mercado.'}
      </p>
      {filtered && (
        <Button variant="outline" onClick={onClear}>
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
