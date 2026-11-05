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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAddToCart } from '@/features/cart/use-cart'
import { useFavorite } from '@/features/favorites/use-favorite'
import { formatEth } from '@/lib/eth'
import { cn } from 'cn'

import { EditionChips } from './edition-chips'
import { NftGallery } from './nft-gallery'
import { RelatedNfts } from './related-nfts'
import { ShareNft } from './share-nft'

function pickEdition(editions: Edition[], preferredId: string | undefined, defaultEditionId: string) {
  const preferred = preferredId ? editions.find((edition) => edition.id === preferredId) : undefined
  if (preferred && preferred.maxPerOrder > 0) return preferred
  const fromDefault = editions.find((edition) => edition.id === defaultEditionId)
  if (fromDefault && fromDefault.maxPerOrder > 0) return fromDefault
  return editions.find((edition) => edition.maxPerOrder > 0) ?? editions[0]
}

function shortenAddress(address: string) {
  if (address.length < 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

type NftDetailViewProps = {
  nft: NftDetail
  editionId: string | undefined
  onEditionChange: (editionId: string | undefined) => void
}

export function NftDetailView({ nft, editionId, onEditionChange }: NftDetailViewProps) {
  const navigate = useNavigate()
  const quantityId = useId()
  const { add, isPending } = useAddToCart()
  const { isFavorite, toggle } = useFavorite(nft)
  const selected = useMemo(
    () => pickEdition(nft.editions, editionId, nft.defaultEditionId),
    [nft.editions, editionId, nft.defaultEditionId],
  )
  const [quantity, setQuantity] = useState(1)
  const max = selected?.maxPerOrder ?? 0
  const safeQuantity = Math.min(Math.max(1, quantity), Math.max(1, max || 1))
  const soldOut = nft.soldOut || max === 0
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

  return (
    <div className="page-container pb-[calc(var(--bottom-nav-height)+7.5rem)] pt-4 md:pb-16 md:pt-6">
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
              <BreadcrumbPage>{nft.name}</BreadcrumbPage>
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
            onClick={toggle}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            className={cn(
              'grid size-10 place-items-center rounded-full border border-border',
              isFavorite && 'text-brand-strong',
            )}
          >
            <Heart className="size-5" fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <NftGallery
          images={nft.gallery}
          alt={nft.name}
          rare={nft.rare}
          soldOut={nft.soldOut}
        />

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

          <p className="mt-3 hidden text-3xl font-bold text-brand md:block">{formatEth(selected?.price ?? nft.price)}</p>

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
            {selected && selected.maxPerOrder === 0 && (
              <p role="status" className="mt-2 text-sm text-required">
                Esta edição está esgotada. Escolha outra disponível.
              </p>
            )}
            {selected && selected.maxPerOrder > 0 && selected.available <= 5 && selected.kind !== 'open' && (
              <p role="status" className="mt-2 text-sm text-muted-foreground">
                Restam {selected.available} {selected.available === 1 ? 'unidade' : 'unidades'}.
              </p>
            )}
          </div>

          <div className="mt-6 hidden flex-wrap items-center gap-3 md:flex">
            <div>
              <label htmlFor={quantityId} className="sr-only">
                Quantidade
              </label>
              <QuantityStepper
                id={quantityId}
                value={safeQuantity}
                max={Math.max(1, max)}
                onChange={setQuantity}
                disabled={soldOut}
              />
            </div>
            <Button
              className="h-11 min-w-36 px-8 uppercase"
              disabled={soldOut || isPending}
              onClick={() => void buy(true)}
            >
              {isPending ? 'Adicionando…' : soldOut ? 'Esgotado' : 'Comprar'}
            </Button>
            <Button
              variant="outline"
              className="h-11 gap-2"
              onClick={toggle}
              aria-pressed={isFavorite}
            >
              <Heart fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
              Favoritar
            </Button>
          </div>

          <dl className="mt-6 grid gap-1.5 text-sm text-muted-foreground">
            <div>
              <dt className="inline">ID do token: </dt>
              <dd className="inline text-foreground">{nft.tokenId}</dd>
            </div>
            <div>
              <dt className="inline">Coleção: </dt>
              <dd className="inline text-foreground">{nft.collection.name}</dd>
            </div>
            <div>
              <dt className="inline">Atributos: </dt>
              <dd className="inline text-foreground">{nft.attributes.join(', ')}</dd>
            </div>
            <div>
              <dt className="inline">Rede: </dt>
              <dd className="inline text-foreground">{NETWORK_LABELS[nft.network]}</dd>
            </div>
          </dl>

          <div className="mt-6 hidden md:block">
            <ShareNft name={nft.name} url={shareUrl} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="detalhes" className="mt-12 md:mt-16">
        <TabsList variant="line" className="h-auto w-full justify-start gap-6 rounded-none bg-transparent p-0">
          <TabsTrigger
            value="detalhes"
            className="rounded-none border-0 px-0 pb-3 text-sm data-[state=active]:text-brand-strong"
          >
            Detalhes do NFT
          </TabsTrigger>
          <TabsTrigger
            value="avaliacoes"
            id="avaliacoes"
            className="rounded-none border-0 px-0 pb-3 text-sm data-[state=active]:text-brand-strong"
          >
            Avaliações de colecionadores ({nft.rating.count})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
          {nft.details.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
          <p>
            <span className="font-bold text-foreground">Rede: </span>
            Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e metadados armazenados no IPFS.
          </p>
          <p>
            <span className="font-bold text-foreground">Contrato: </span>
            Direitos autorais do criador: {nft.royaltiesPercent}% nas vendas secundárias, pagos automaticamente pelos
            mercados compatíveis.
          </p>
          <p>
            <span className="font-bold text-foreground">Endereço: </span>
            <a
              href={`https://etherscan.io/address/${nft.contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-brand-strong underline underline-offset-4"
            >
              {shortenAddress(nft.contractAddress)}
            </a>
            {' · '}
            Contrato inteligente ERC-721 verificado (link simulado).
          </p>
        </TabsContent>

        <TabsContent value="avaliacoes" className="mt-6">
          {nft.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há avaliações para este NFT.</p>
          ) : (
            <ul className="grid max-w-3xl gap-4">
              {nft.reviews.map((review) => (
                <li key={review.id} className="rounded-md bg-surface px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">{review.author}</p>
                    <StarRating value={review.rating} size="sm" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                  <p className="mt-2 text-xs text-subtle">
                    <time dateTime={review.createdAt}>
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(review.createdAt))}
                    </time>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <RelatedNfts nftId={nft.id} collectionId={nft.collection.id} collectionName={nft.collection.name} />

      <aside
        aria-label="Comprar"
        className="fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-50 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm md:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Qtd.</span>
            <QuantityStepper
              value={safeQuantity}
              max={Math.max(1, max)}
              onChange={setQuantity}
              disabled={soldOut}
              size="compact"
            />
          </div>
          <p className="text-lg font-bold text-brand">{formatEth(selected?.price ?? nft.price)}</p>
        </div>
        <div className="mx-auto mt-3 flex max-w-lg gap-2">
          <Button
            className="h-12 flex-1 rounded-full text-base"
            disabled={soldOut || isPending}
            onClick={() => void buy(true)}
          >
            {isPending ? 'Adicionando…' : soldOut ? 'Esgotado' : 'Comprar NFT'}
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
