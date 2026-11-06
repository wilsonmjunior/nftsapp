import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Heart, ShoppingCart } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'

import { NETWORK_LABELS, type Edition, type NftDetail } from '@/api/contracts'
import { QuantityStepper } from '@/components/quantity-stepper'
import { StarRating } from '@/components/star-rating'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddToCart } from '@/features/cart/use-cart'
import { useFavorite } from '@/features/favorites/use-favorite'
import { formatEth } from '@/lib/eth'
import { cn } from 'cn'

import { EditionChips } from './edition-chips'
import { NftDetailTabs } from './nft-detail-tabs'
import { NftGallery } from './nft-gallery'
import { RelatedNfts } from './related-nfts'
import { ShareNft } from './share-nft'

const LOW_STOCK_THRESHOLD = 5

function isPurchasable(edition: Edition | undefined): edition is Edition {
  return Boolean(edition && edition.maxPerOrder > 0)
}

function pickEdition(editions: Edition[], preferredId: string | undefined, defaultEditionId: string) {
  const preferred = editions.find((edition) => edition.id === preferredId)
  if (isPurchasable(preferred)) return preferred
  const fromDefault = editions.find((edition) => edition.id === defaultEditionId)
  if (isPurchasable(fromDefault)) return fromDefault
  return editions.find(isPurchasable) ?? editions[0]
}

function buyLabel({ isPending, soldOut, idleLabel }: { isPending: boolean; soldOut: boolean; idleLabel: string }) {
  if (isPending) return 'Adicionando…'
  if (soldOut) return 'Esgotado'
  return idleLabel
}

type FavoriteState = { isFavorite: boolean; toggle: () => void }

type NftDetailViewProps = {
  nft: NftDetail
  editionId: string | undefined
  onEditionChange: (editionId: string | undefined) => void
}

export function NftDetailView({ nft, editionId, onEditionChange }: NftDetailViewProps) {
  const navigate = useNavigate()
  const quantityId = useId()
  const { add, isPending } = useAddToCart()
  const favorite = useFavorite(nft)
  const selected = useMemo(
    () => pickEdition(nft.editions, editionId, nft.defaultEditionId),
    [nft.editions, editionId, nft.defaultEditionId],
  )
  const [quantity, setQuantity] = useState(1)
  const max = selected?.maxPerOrder ?? 0
  const stepperMax = Math.max(1, max)
  const safeQuantity = Math.min(Math.max(1, quantity), stepperMax)
  const soldOut = nft.soldOut || max === 0
  const price = formatEth(selected?.price ?? nft.price)
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href

  useEffect(() => {
    if (selected && selected.id !== editionId) onEditionChange(selected.id)
  }, [selected, editionId, onEditionChange])

  async function buy(andGoToCart: boolean) {
    if (!selected || soldOut) return
    await add({
      nftId: nft.id,
      editionId: selected.id,
      quantity: safeQuantity,
      name: nft.name,
      maxPerOrder: selected.maxPerOrder,
    })
    if (andGoToCart) void navigate({ to: '/carrinho' })
  }

  const quantityStepperProps = { value: safeQuantity, max: stepperMax, onChange: setQuantity, disabled: soldOut }

  return (
    <div className="page-container pb-[calc(var(--bottom-nav-height)+7.5rem)] pt-4 md:pb-16 md:pt-6">
      <DetailTopBar nftName={nft.name} favorite={favorite} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <NftGallery images={nft.gallery} alt={nft.name} rare={nft.rare} soldOut={nft.soldOut} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-bold md:text-[32px] md:leading-tight">{nft.name}</h1>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand/50 px-3 py-1 text-sm md:hidden">
              <StarRating value={nft.rating.average} size="sm" />
              <span>
                {nft.rating.average.toFixed(1)} ({nft.rating.count})
              </span>
            </p>
          </div>

          <p className="mt-3 hidden text-3xl font-bold text-brand md:block">{price}</p>

          <div className="mt-3 hidden items-center gap-3 md:flex">
            <StarRating value={nft.rating.average} />
            <a href="#avaliacoes" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              {nft.rating.count} {nft.rating.count === 1 ? 'avaliação de colecionador' : 'avaliações de colecionadores'}
            </a>
          </div>

          <div className="mt-5">
            <h2 className="sr-only md:not-sr-only md:mb-2 md:text-sm md:font-bold">Sobre este NFT:</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{nft.description}</p>
          </div>

          <div className="mt-6">
            <EditionChips
              editions={nft.editions}
              value={selected?.id ?? ''}
              onChange={(id) => {
                setQuantity(1)
                onEditionChange(id)
              }}
            />
            {selected && <EditionStockNotice edition={selected} />}
          </div>

          <div className="mt-6 hidden flex-wrap items-center gap-3 md:flex">
            <div>
              <label htmlFor={quantityId} className="sr-only">
                Quantidade
              </label>
              <QuantityStepper id={quantityId} {...quantityStepperProps} />
            </div>
            <Button
              className="h-11 min-w-36 px-8 uppercase"
              disabled={soldOut || isPending}
              onClick={() => void buy(true)}
            >
              {buyLabel({ isPending, soldOut, idleLabel: 'Comprar' })}
            </Button>
            <Button variant="outline" className="h-11 gap-2" onClick={favorite.toggle} aria-pressed={favorite.isFavorite}>
              <Heart fill={favorite.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
              Favoritar
            </Button>
          </div>

          <dl className="mt-6 grid gap-1.5 text-sm text-muted-foreground">
            <DetailRow label="ID do token" value={nft.tokenId} />
            <DetailRow label="Coleção" value={nft.collection.name} />
            <DetailRow label="Atributos" value={nft.attributes.join(', ')} />
            <DetailRow label="Rede" value={NETWORK_LABELS[nft.network]} />
          </dl>

          <div className="mt-6 hidden md:block">
            <ShareNft name={nft.name} url={shareUrl} />
          </div>
        </div>
      </div>

      <NftDetailTabs nft={nft} />

      <RelatedNfts nftId={nft.id} collectionId={nft.collection.id} collectionName={nft.collection.name} />

      <aside
        aria-label="Comprar"
        className="fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-50 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm md:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Qtd.</span>
            <QuantityStepper {...quantityStepperProps} size="compact" />
          </div>
          <p className="text-lg font-bold text-brand">{price}</p>
        </div>
        <div className="mx-auto mt-3 flex max-w-lg gap-2">
          <Button
            className="h-12 flex-1 rounded-full text-base"
            disabled={soldOut || isPending}
            onClick={() => void buy(true)}
          >
            {buyLabel({ isPending, soldOut, idleLabel: 'Comprar NFT' })}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="relative z-10 size-12 shrink-0 rounded-full"
            disabled={soldOut || isPending}
            aria-label="Adicionar ao carrinho"
            onClick={() => void buy(false)}
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </aside>
    </div>
  )
}

function DetailTopBar({ nftName, favorite }: { nftName: string; favorite: FavoriteState }) {
  return (
    <div className="mb-4 flex items-center justify-between md:mb-6">
      <Breadcrumb className="hidden md:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Início</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" hash="catalogo">
                Mercado
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>{nftName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex w-full items-center justify-between md:hidden">
        <Link
          to="/"
          hash="catalogo"
          aria-label="Voltar ao mercado"
          className="grid size-10 place-items-center rounded-full border border-border text-foreground"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={favorite.toggle}
          aria-pressed={favorite.isFavorite}
          aria-label={favorite.isFavorite ? `Remover ${nftName} dos favoritos` : `Favoritar ${nftName}`}
          className={cn(
            'grid size-10 place-items-center rounded-full border border-border',
            favorite.isFavorite && 'text-brand-strong',
          )}
        >
          <Heart className="size-5" fill={favorite.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function EditionStockNotice({ edition }: { edition: Edition }) {
  if (edition.maxPerOrder === 0) {
    return (
      <p role="status" className="mt-2 text-sm text-required">
        Esta edição está esgotada. Escolha outra disponível.
      </p>
    )
  }

  const lowStock = edition.kind !== 'open' && edition.available <= LOW_STOCK_THRESHOLD
  if (!lowStock) return null

  return (
    <p role="status" className="mt-2 text-sm text-muted-foreground">
      Restam {edition.available} {edition.available === 1 ? 'unidade' : 'unidades'}.
    </p>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline">{label}: </dt>
      <dd className="inline text-foreground">{value}</dd>
    </div>
  )
}

export function NftDetailSkeleton() {
  return (
    <div className="page-container grid gap-8 py-8 lg:grid-cols-2" aria-busy="true" aria-label="Carregando NFT">
      <Skeleton className="aspect-square w-full rounded-[20px]" />
      <div className="grid content-start gap-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-48" />
      </div>
    </div>
  )
}
