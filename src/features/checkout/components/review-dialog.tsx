import type { Quote } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatEth } from '@/lib/eth'

import type { ReviewState } from '../use-checkout-page'

type ReviewDialogProps = {
  review: ReviewState | null
  onCancel: () => void
  onConfirm: () => void
  confirming?: boolean
}

function titleFor(reason: ReviewState['reason']) {
  switch (reason) {
    case 'PRICE_CHANGED':
      return 'Preço atualizado'
    case 'AVAILABILITY_CONFLICT':
      return 'Disponibilidade alterada'
    case 'QUOTE_EXPIRED':
      return 'Cotação expirada'
    default:
      return 'Revisar pagamento'
  }
}

function Totals({ quote }: { quote: Quote }) {
  return (
    <dl className="mt-4 grid gap-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd>{formatEth(quote.subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Desconto</dt>
        <dd>(-)&nbsp;{formatEth(quote.discount)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Taxa de rede</dt>
        <dd>{formatEth(quote.networkFee)}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-bold">
        <dt>Total</dt>
        <dd className="text-brand">{formatEth(quote.total)}</dd>
      </div>
    </dl>
  )
}

export function ReviewDialog({ review, onCancel, onConfirm, confirming }: ReviewDialogProps) {
  return (
    <Dialog open={Boolean(review)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md border-border bg-surface">
        {review && (
          <>
            <DialogHeader>
              <DialogTitle>{titleFor(review.reason)}</DialogTitle>
              <DialogDescription>{review.message}</DialogDescription>
            </DialogHeader>
            <Totals quote={review.quote} />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={confirming}>
                Voltar
              </Button>
              <Button type="button" onClick={onConfirm} disabled={confirming}>
                {confirming ? 'Enviando…' : 'Confirmar e pagar'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
