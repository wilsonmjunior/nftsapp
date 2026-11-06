import { NETWORK_LABELS, type NftDetail } from '@/api/contracts'
import { StarRating } from '@/components/star-rating'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { shortAddress } from '@/lib/eth'

const reviewDateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' })

const triggerClass = 'rounded-none border-0 px-0 pb-3 text-sm data-[state=active]:text-brand-strong'

export function NftDetailTabs({ nft }: { nft: NftDetail }) {
  return (
    <Tabs defaultValue="detalhes" className="mt-12 md:mt-16">
      <TabsList variant="line" className="h-auto w-full justify-start gap-6 rounded-none bg-transparent p-0">
        <TabsTrigger value="detalhes" className={triggerClass}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="avaliacoes" id="avaliacoes" className={triggerClass}>
          Avaliações de colecionadores ({nft.rating.count})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="detalhes" className="mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground">
        <DetailsContent nft={nft} />
      </TabsContent>

      <TabsContent value="avaliacoes" className="mt-6">
        <ReviewsContent reviews={nft.reviews} />
      </TabsContent>
    </Tabs>
  )
}

function DetailsContent({ nft }: { nft: NftDetail }) {
  return (
    <>
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
          {shortAddress(nft.contractAddress)}
        </a>
        {' · '}
        Contrato inteligente ERC-721 verificado (link simulado).
      </p>
    </>
  )
}

function ReviewsContent({ reviews }: { reviews: NftDetail['reviews'] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não há avaliações para este NFT.</p>
  }

  return (
    <ul className="grid max-w-3xl gap-4">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-md bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">{review.author}</p>
            <StarRating value={review.rating} size="sm" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
          <p className="mt-2 text-xs text-subtle">
            <time dateTime={review.createdAt}>{reviewDateFormat.format(new Date(review.createdAt))}</time>
          </p>
        </li>
      ))}
    </ul>
  )
}
