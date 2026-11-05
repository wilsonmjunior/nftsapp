import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'

import { NETWORK_LABELS, type NftSummary } from '@/api/contracts'
import { NftImage } from '@/components/nft-image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useFavorite } from '@/features/favorites/use-favorite'
import { formatEth } from '@/lib/eth'

type QuickViewProps = { nft: NftSummary; open: boolean; onOpenChange: (open: boolean) => void }

export default function NftQuickView({ nft, open, onOpenChange }: QuickViewProps) {
  const { isFavorite, toggle } = useFavorite(nft)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-w-[calc(100%-2rem)] gap-6 border-border bg-surface p-6 sm:max-w-2xl sm:grid-cols-[260px_1fr]">
        <div className="overflow-hidden rounded-xl">
          <NftImage src={nft.image} alt="" sizes="260px" />
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{nft.collection.name}</p>
          <DialogTitle className="text-xl font-bold">{nft.name}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Token {nft.tokenId} · {NETWORK_LABELS[nft.network]}
          </DialogDescription>
          <p className="flex items-baseline gap-2 text-2xl font-bold text-brand">
            {formatEth(nft.price)}
            {nft.originalPrice && (
              <s className="text-base font-normal text-muted-foreground">
                <span className="sr-only">Preço anterior: </span>
                {formatEth(nft.originalPrice)}
              </s>
            )}
          </p>
          {nft.soldOut && <p className="font-bold">Todas as edições estão esgotadas.</p>}
          <div className="mt-auto flex flex-wrap gap-3 pt-4">
            <Button asChild>
              <Link to="/nfts/$nftId" params={{ nftId: nft.id }}>
                Ver detalhes
              </Link>
            </Button>
            <Button variant="outline" onClick={toggle} aria-pressed={isFavorite}>
              <Heart fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
              {isFavorite ? 'Favoritado' : 'Favoritar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
