import { cn } from 'cn'
import { useId, useState } from 'react'

import type { NftListResponse } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'

import { hasActiveFilters, type CatalogSearch } from '../search'

type Facets = NftListResponse['facets']
type FacetCount = Facets['collections'][number]

export type CatalogPatch = Partial<Omit<CatalogSearch, 'page'>>

type CatalogFiltersProps = {
  search: CatalogSearch
  facets: Facets | undefined
  onChange: (patch: CatalogPatch) => void
  onClear: () => void
}

export function CatalogFilters({ search, facets, onChange, onClear }: CatalogFiltersProps) {
  return (
    <div className="grid gap-9">
      <FacetGroup
        title="Coleções"
        options={facets?.collections}
        selected={search.collection}
        onChange={(collection) => onChange({ collection })}
      />

      {facets ? (
        <PriceFilter
          key={`${search.minPrice}:${search.maxPrice}:${facets.priceRange.min}:${facets.priceRange.max}`}
          range={facets.priceRange}
          minPrice={search.minPrice}
          maxPrice={search.maxPrice}
          onApply={(minPrice, maxPrice) => onChange({ minPrice, maxPrice })}
        />
      ) : (
        <FilterSkeleton title="Faixa de preço" rows={2} />
      )}

      <FacetGroup
        title="Rede"
        options={facets?.networks}
        selected={search.network}
        onChange={(network) => onChange({ network: network as CatalogSearch['network'] })}
      />

      {hasActiveFilters(search) && (
        <Button variant="outline" size="sm" onClick={onClear} className="justify-self-start">
          Limpar filtros
        </Button>
      )}
    </div>
  )
}

function FacetGroup({
  title,
  options,
  selected,
  onChange,
}: {
  title: string
  options: FacetCount[] | undefined
  selected: string[] | undefined
  onChange: (value: string[] | undefined) => void
}) {
  const headingId = useId()
  if (!options) return <FilterSkeleton title={title} rows={title === 'Rede' ? 3 : 9} />

  function toggle(id: string) {
    const current = selected ?? []
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    onChange(next.length ? next : undefined)
  }

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="mb-3 text-[15px] font-bold">
        {title}
      </h3>
      <ul className="grid gap-1">
        {options.map((option) => {
          const active = selected?.includes(option.id) ?? false
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggle(option.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-sm py-1.5 pl-2 text-left text-sm transition-colors hover:text-brand-strong',
                  active ? 'font-bold text-brand-strong' : 'text-muted-foreground',
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn('size-1.5 rounded-full', active ? 'bg-brand-strong' : 'bg-transparent')}
                  />
                  {option.name}
                </span>
                <span className="tabular-nums">
                  ({option.count})<span className="sr-only"> NFTs</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const toNumber = (value: string) => Number(value)
const toAmount = (value: number) => value.toFixed(2)
const formatPt = (value: number) => value.toFixed(2).replace('.', ',')

function PriceFilter({
  range,
  minPrice,
  maxPrice,
  onApply,
}: {
  range: Facets['priceRange']
  minPrice: string | undefined
  maxPrice: string | undefined
  onApply: (min: string | undefined, max: string | undefined) => void
}) {
  const headingId = useId()
  const bounds = [Math.floor(toNumber(range.min) * 100) / 100, Math.ceil(toNumber(range.max) * 100) / 100] as const
  const [value, setValue] = useState<number[]>([
    minPrice ? toNumber(minPrice) : bounds[0],
    maxPrice ? toNumber(maxPrice) : bounds[1],
  ])
  const [low, high] = value as [number, number]

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="mb-4 text-[15px] font-bold">
        Faixa de preço
      </h3>
      <Slider
        min={bounds[0]}
        max={bounds[1]}
        step={0.01}
        minStepsBetweenThumbs={1}
        value={value}
        onValueChange={setValue}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
        aria-labelledby={headingId}
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Preço: {formatPt(low)} – {formatPt(high)} ETH
      </p>
      <Button
        size="sm"
        className="mt-3"
        onClick={() => onApply(low > bounds[0] ? toAmount(low) : undefined, high < bounds[1] ? toAmount(high) : undefined)}
      >
        Aplicar
      </Button>
    </section>
  )
}

function FilterSkeleton({ title, rows }: { title: string; rows: number }) {
  return (
    <section aria-busy="true" aria-label={`${title}, carregando`}>
      <p className="mb-3 text-[15px] font-bold">{title}</p>
      <div className="grid gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-4" />
        ))}
      </div>
    </section>
  )
}
