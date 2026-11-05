import { Link } from '@tanstack/react-router'
import { CircleAlert, CircleCheck, ExternalLink, Loader2 } from 'lucide-react'

import {
  NETWORK_LABELS,
  WALLET_TYPE_LABELS,
  type Network,
  type Order,
} from '@/api/contracts'
import { NftImage } from '@/components/nft-image'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/eth'

const EXPLORER_LABEL: Record<Network, string> = {
  ethereum: 'Ver no Etherscan',
  polygon: 'Ver no Polygonscan',
  solana: 'Ver no Solscan',
}

function shortHash(hash: string) {
  if (hash.length < 18) return hash
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`
}

function shortAddress(address: string) {
  if (address.length < 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type OrderReceiptProps = {
  order: Order
}

export function OrderReceipt({ order }: OrderReceiptProps) {
  const statusLabel =
    order.status === 'confirmed'
      ? 'Pedido confirmado'
      : order.status === 'declined'
        ? 'Pedido recusado'
        : 'Pagamento pendente'

  return (
    <article
      aria-labelledby="pedido-titulo"
      data-status={order.status}
      className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-8"
    >
      <header className="text-center">
        <StatusIcon status={order.status} />
        <h1 id="pedido-titulo" className="mt-4 text-xl font-bold md:text-2xl">
          {statusLabel}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pedido <span className="font-mono text-foreground">{order.id}</span>
        </p>

        {order.status === 'pending' && (
          <p role="status" aria-live="polite" className="mt-3 text-sm text-brand-strong">
            Aguardando confirmação na rede. Esta página atualiza sozinha.
          </p>
        )}
        {order.status === 'declined' && (
          <p role="alert" className="mt-3 text-sm text-required">
            {order.declineReason ?? 'O pagamento foi recusado.'}
          </p>
        )}
        {order.status === 'confirmed' && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            Recibo fixo do momento da compra — alterações no catálogo não mudam estes valores.
          </p>
        )}
      </header>

      <ul className="mt-8 grid gap-4 border-t border-border pt-6">
        {order.items.map((item) => (
          <li key={`${item.nftId}-${item.editionId}`} className="flex items-start gap-3">
            <NftImage src={item.image} alt="" sizes="56px" className="size-14 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {item.editionLabel}
                {item.tokenId ? ` · ${item.tokenId}` : ''}
                {' · '}×{item.quantity}
              </p>
              <p className="mt-0.5 text-xs text-subtle">{formatEth(item.unitPrice)} cada</p>
            </div>
            <p className="shrink-0 text-sm font-bold text-brand">{formatEth(item.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-6 grid gap-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatEth(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            Desconto
            {order.coupon ? (
              <span className="mt-0.5 block text-xs text-brand-strong">Cupom {order.coupon.code}</span>
            ) : null}
          </dt>
          <dd>(-)&nbsp;{formatEth(order.discount)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            Taxa de rede
            <span className="mt-0.5 block text-xs text-subtle">{NETWORK_LABELS[order.network]}</span>
          </dt>
          <dd>{formatEth(order.networkFee)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-bold">
          <dt>Total</dt>
          <dd className="text-brand">{formatEth(order.total)}</dd>
        </div>
      </dl>

      <dl className="mt-6 grid gap-3 border-t border-border pt-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Carteira</dt>
          <dd className="text-right">
            {order.wallet.label}
            <span className="mt-0.5 block font-mono text-xs text-subtle">
              {WALLET_TYPE_LABELS[order.wallet.type]} · {shortAddress(order.wallet.address)}
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Rede</dt>
          <dd>{NETWORK_LABELS[order.network]}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Data</dt>
          <dd>{formatOrderDate(order.createdAt)}</dd>
        </div>
        {order.transaction && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Transação</dt>
            <dd className="min-w-0 text-right">
              <span className="block font-mono text-xs text-foreground">{shortHash(order.transaction.hash)}</span>
              <a
                href={order.transaction.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-brand-strong underline-offset-2 hover:underline"
              >
                {EXPLORER_LABEL[order.network]}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
              <span className="mt-0.5 block text-xs text-subtle">(link simulado)</span>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild className="h-11">
          <Link to="/" hash="catalogo">
            Continuar explorando
          </Link>
        </Button>
        {order.status === 'declined' && (
          <Button asChild variant="outline" className="h-11">
            <Link to="/carrinho">Voltar ao carrinho</Link>
          </Button>
        )}
        {order.status === 'pending' && (
          <Button asChild variant="outline" className="h-11">
            <Link to="/">Ir ao início</Link>
          </Button>
        )}
      </div>
    </article>
  )
}

function StatusIcon({ status }: { status: Order['status'] }) {
  if (status === 'confirmed') {
    return <CircleCheck className="mx-auto size-12 text-brand" aria-hidden="true" />
  }
  if (status === 'declined') {
    return <CircleAlert className="mx-auto size-12 text-required" aria-hidden="true" />
  }
  return <Loader2 className="mx-auto size-12 animate-spin text-brand" aria-hidden="true" />
}
