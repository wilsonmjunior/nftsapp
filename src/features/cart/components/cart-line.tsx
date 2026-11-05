import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'

import { NftImage } from '@/components/nft-image'
import { QuantityStepper } from '@/components/quantity-stepper'
import { formatEth } from '@/lib/eth'
import { cn } from 'cn'

import type { CartDisplayItem } from '../use-cart-page'

const ISSUE_LABEL: Record<CartDisplayItem['issues'][number], string> = {
  PRICE_CHANGED: 'O preço mudou desde que o item entrou no carrinho.',
  INSUFFICIENT_AVAILABILITY: 'A quantidade pedida ultrapassa o estoque atual.',
  SOLD_OUT: 'Esta edição está esgotada.',
  NOT_FOUND: 'Este NFT não está mais disponível.',
}

type CartLineProps = {
  item: CartDisplayItem
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
  disabled?: boolean
}

export function CartLine({ item, onQuantityChange, onRemove, disabled }: CartLineProps) {
  const hasIssues = item.issues.length > 0
  const soldOut = item.issues.includes('SOLD_OUT') || item.maxPerOrder === 0

  return (
    <article
      className={cn(
        'grid gap-4 border-b border-border py-5 md:grid-cols-[minmax(0,1.4fr)_0.7fr_0.9fr_0.7fr_auto] md:items-center md:gap-6',
        hasIssues && 'rounded-md bg-required/5',
      )}
      aria-label={`${item.name}, ${item.quantity} ${item.quantity === 1 ? 'edição' : 'edições'}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: item.nftId }}
          aria-label={`Ver ${item.name}`}
          className="shrink-0 overflow-hidden rounded-lg"
        >
          <NftImage src={item.image} alt="" sizes="72px" className="size-16 md:size-[72px]" />
        </Link>
        <div className="min-w-0">
          <Link
            to="/nfts/$nftId"
            params={{ nftId: item.nftId }}
            className="block truncate font-bold hover:text-brand-strong"
          >
            {item.name}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="md:hidden">Edição: {item.editionLabel} · </span>
            {item.tokenId}
          </p>
          <p className="mt-1 text-lg font-bold text-brand md:hidden">{formatEth(item.unitPrice)}</p>
        </div>
      </div>

      <p className="hidden text-sm md:block">{formatEth(item.unitPrice)}</p>

      <div className="flex items-center justify-between gap-3 md:justify-start">
        <QuantityStepper
          value={item.quantity}
          max={Math.max(1, item.maxPerOrder)}
          onChange={onQuantityChange}
          disabled={disabled || soldOut}
          size="compact"
          className="border-brand/40"
          aria-label={`Quantidade de ${item.name}`}
        />
        <button
          type="button"
          aria-label={`Remover ${item.name} do carrinho`}
          onClick={onRemove}
          disabled={disabled}
          className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-required md:hidden"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <p className="hidden text-sm font-bold md:block">{formatEth(item.lineTotal)}</p>

      <button
        type="button"
        aria-label={`Remover ${item.name} do carrinho`}
        onClick={onRemove}
        disabled={disabled}
        className="hidden size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-required md:grid"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>

      {hasIssues && (
        <ul className="md:col-span-5" role="status">
          {item.issues.map((issue) => (
            <li key={issue} className="text-sm text-required">
              {ISSUE_LABEL[issue]}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
