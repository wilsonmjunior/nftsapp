import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'

import { catalogApi } from '@/api/catalog'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { cn } from 'cn'

type RelatedNftsProps = {
  nftId: string
  collectionId: string
  collectionName: string
}

export function RelatedNfts({ nftId, collectionId, collectionName }: RelatedNftsProps) {
  const scroller = useRef<HTMLUListElement>(null)
  const query = useQuery({
    queryKey: ['catalog', 'related', collectionId, nftId],
    queryFn: ({ signal }) =>
      catalogApi.list({ collections: [collectionId], pageSize: 12, sort: 'popular' }, signal).then((response) => ({
        ...response,
        items: response.items.filter((item) => item.id !== nftId).slice(0, 8),
      })),
  })

  const items = query.data?.items ?? []
  if (query.isSuccess && items.length === 0) return null

  return (
    <section aria-labelledby="mais-colecao-title" className="mt-16 md:mt-20">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-border pb-3">
        <h2 id="mais-colecao-title" className="text-xl font-bold text-brand-strong md:text-2xl">
          Mais desta coleção
        </h2>
        <p className="text-sm text-muted-foreground">{collectionName}</p>
      </div>

      <ul
        ref={scroller}
        aria-label={`Mais NFTs de ${collectionName}`}
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
