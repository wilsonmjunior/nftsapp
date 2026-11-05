import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { Heart, Search } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'

import type { NftSummary } from '@/api/contracts'
import { NftImage } from '@/components/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { useFavorite } from '@/features/favorites/use-favorite'
import { formatEth } from '@/lib/eth'

const QuickView = lazy(() => import('./nft-quick-view'))

const NFT_CARD_SIZES = '(min-width: 1024px) 184px, (min-width: 768px) 28vw, 45vw'

const actionButton =
  'grid size-8 place-items-center rounded-md bg-surface/95 text-foreground shadow-md shadow-black/30 transition-colors hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const { isFavorite, toggle } = useFavorite(nft)
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const favoriteLabel = isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`

  return (
    <article className="group relative">
      <div className="relative rounded-xl bg-surface p-1 md:rounded-md md:px-1 md:py-4">
        <NftImage
          src={nft.image}
          alt=""
          sizes={NFT_CARD_SIZES}
          priority={priority}
          className={cn('rounded-[14px] transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100', nft.soldOut && 'opacity-50 grayscale')}
        />

        {(nft.rare || nft.soldOut) && (
          <p className="absolute top-3 left-0 flex flex-col items-start gap-1 md:top-0">
            {nft.rare && (
              <span className="bg-brand px-3 py-1 text-xs font-bold text-primary-foreground md:px-4">RARO</span>
            )}
            {nft.soldOut && <span className="bg-foreground px-3 py-1 text-xs font-bold text-page md:px-4">ESGOTADO</span>}
          </p>
        )}

        {/* No toque não existe hover: o favorito fica sempre visível no canto, como no layout mobile. */}
        <div className="absolute top-3 right-3 z-10 flex gap-2 md:top-auto md:right-auto md:bottom-1 md:left-1/2 md:-translate-x-1/2 md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={toggle}
            aria-pressed={isFavorite}
            aria-label={favoriteLabel}
            title={favoriteLabel}
            className={cn(actionButton, isFavorite && 'text-brand-strong')}
          >
            <Heart className="size-4" fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            aria-label={`Visualização rápida de ${nft.name}`}
            title="Visualização rápida"
            className={cn(actionButton, 'max-md:hidden')}
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <h3 className="mt-4 text-[15px] leading-tight md:text-sm">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {nft.name}
        </Link>
      </h3>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-base font-bold text-brand md:text-sm">
        <span>
          <span className="sr-only">Preço: </span>
          {formatEth(nft.price)}
        </span>
        {nft.originalPrice && (
          <s className="font-normal text-muted-foreground">
            <span className="sr-only">Preço anterior: </span>
            {formatEth(nft.originalPrice)}
          </s>
        )}
        {nft.soldOut && <span className="sr-only">, esgotado</span>}
      </p>

      {quickViewOpen && (
        <Suspense>
          <QuickView nft={nft} open onOpenChange={setQuickViewOpen} />
        </Suspense>
      )}
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="rounded-xl bg-surface p-1 md:rounded-md md:px-1 md:py-4">
        <Skeleton className="aspect-square w-full rounded-[14px]" />
      </div>
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  )
}
