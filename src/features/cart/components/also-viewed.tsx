import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'

import { catalogApi } from '@/api/catalog'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'

type AlsoViewedProps = {
  excludeIds: string[]
}

export function AlsoViewed({ excludeIds }: AlsoViewedProps) {
  const exclude = new Set(excludeIds)
  const query = useQuery({
    queryKey: ['catalog', 'also-viewed', [...exclude].sort().join(',')],
    queryFn: ({ signal }) =>
      catalogApi.list({ sort: 'popular', pageSize: 12 }, signal).then((response) => ({
        items: response.items.filter((item) => !exclude.has(item.id)).slice(0, 5),
      })),
  })

  const items = query.data?.items ?? []
  if (query.isSuccess && items.length === 0) return null

  return (
    <section aria-labelledby="also-viewed-title" className="mt-16 md:mt-20">
      <div className="mb-6 border-b border-border pb-3">
        <h2 id="also-viewed-title" className="text-xl font-bold text-brand-strong md:text-2xl">
          Colecionadores também viram
        </h2>
      </div>
      <ul
        aria-label="Recomendações"
        className={cn(
          'grid grid-flow-col auto-cols-[minmax(140px,180px)] gap-4 overflow-x-auto pb-2 md:auto-cols-[minmax(160px,1fr)] md:grid-cols-5 md:grid-flow-row md:overflow-visible',
          'snap-x snap-mandatory md:snap-none',
        )}
      >
        {query.isPending
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={index} className="snap-start">
                <NftCardSkeleton />
              </li>
            ))
          : items.map((nft) => (
              <li key={nft.id} className="snap-start">
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
    </section>
  )
}
