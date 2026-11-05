import { Link } from '@tanstack/react-router'

import type { Quote } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import { NETWORK_LABELS } from '@/api/contracts'

type CartSummaryProps = {
  quote: Quote | undefined
  pending?: boolean
  draftCoupon: string
  onDraftCouponChange: (value: string) => void
  appliedCoupon: string | null
  couponError: string | null
  onApplyCoupon: () => void
  onRemoveCoupon: () => void
  applyingCoupon?: boolean
  onCheckout: () => void
  checkoutLabel: string
  disabledCheckout?: boolean
}

export function CartSummary({
  quote,
  pending,
  draftCoupon,
  onDraftCouponChange,
  appliedCoupon,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  applyingCoupon,
  onCheckout,
  checkoutLabel,
  disabledCheckout,
}: CartSummaryProps) {
  return (
    <aside
      aria-labelledby="resumo-carteira-title"
      className="rounded-xl border border-border bg-surface p-5 md:sticky md:top-6 md:p-6"
    >
      <h2 id="resumo-carteira-title" className="text-lg font-bold">
        Resumo da carteira
      </h2>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault()
          onApplyCoupon()
        }}
      >
        <Label htmlFor="coupon-code" className="text-sm text-muted-foreground">
          Código promocional
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="coupon-code"
            value={draftCoupon}
            onChange={(event) => onDraftCouponChange(event.target.value)}
            placeholder="Digite o código promocional..."
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(couponError) || undefined}
            aria-describedby={couponError ? 'coupon-error' : appliedCoupon ? 'coupon-applied' : undefined}
            className="h-11 flex-1 bg-page"
          />
          <Button type="submit" className="h-11 shrink-0 px-4" disabled={applyingCoupon}>
            {applyingCoupon ? '…' : 'Aplicar'}
          </Button>
        </div>
        {couponError && (
          <p id="coupon-error" role="alert" className="mt-2 text-sm text-required">
            {couponError}
          </p>
        )}
        {appliedCoupon && !couponError && (
          <p id="coupon-applied" className="mt-2 flex flex-wrap items-center gap-2 text-sm text-brand-strong">
            <span>Cupom {appliedCoupon} aplicado.</span>
            <button type="button" onClick={onRemoveCoupon} className="underline underline-offset-2">
              Remover
            </button>
          </p>
        )}
      </form>

      <dl className="mt-6 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{pending && !quote ? <Skeleton className="h-4 w-20" /> : formatEth(quote?.subtotal ?? '0')}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Desconto do lançamento</dt>
          <dd>
            {pending && !quote ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <>(-)&nbsp;{formatEth(quote?.discount ?? '0')}</>
            )}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-muted-foreground">
            Taxa de rede
            <span className="mt-0.5 block text-xs text-brand-strong">
              Taxa estimada
              {quote ? ` · ${NETWORK_LABELS[quote.network]}` : ''}
            </span>
          </dt>
          <dd>{pending && !quote ? <Skeleton className="h-4 w-16" /> : formatEth(quote?.networkFee ?? '0')}</dd>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-4">
          <dt className="text-base font-bold">Total</dt>
          <dd className="text-xl font-bold text-brand">
            {pending && !quote ? <Skeleton className="h-6 w-28" /> : formatEth(quote?.total ?? '0')}
          </dd>
        </div>
      </dl>

      <Button
        className="mt-6 h-12 w-full text-base"
        onClick={onCheckout}
        disabled={disabledCheckout || pending}
      >
        {checkoutLabel}
      </Button>
      <Link
        to="/"
        hash="catalogo"
        className="mt-3 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-brand-strong hover:underline"
      >
        Continuar explorando
      </Link>
    </aside>
  )
}
