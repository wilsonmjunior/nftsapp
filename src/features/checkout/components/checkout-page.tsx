import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

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

import { useCheckoutPage } from '../use-checkout-page'
import { CheckoutSummary } from './checkout-summary'
import { CollectorForm } from './collector-form'
import { ReviewDialog } from './review-dialog'
import { WalletPanel } from './wallet-panel'

export function CheckoutPage() {
  const checkout = useCheckoutPage()

  return (
    <div className="page-container pb-[calc(var(--bottom-nav-height)+1rem)] pt-4 md:pb-16 md:pt-6">
      <div className="mb-6 flex items-center justify-between md:mb-8">
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
                <Link to="/carrinho">Carrinho</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Pagamento</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="relative flex w-full items-center justify-center md:hidden">
          <Link
            to="/carrinho"
            aria-label="Voltar ao carrinho"
            className="absolute left-0 grid size-10 place-items-center rounded-full border border-border"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <h1 className="text-lg font-bold">Pagamento</h1>
        </div>
        <h1 className="hidden text-2xl font-bold md:block">Pagamento</h1>
      </div>

      {checkout.isLoading ? (
        <CheckoutSkeleton />
      ) : checkout.isEmpty ? (
        <EmptyCheckout />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void checkout.submit()
          }}
          noValidate
          className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.75fr)] lg:items-start lg:gap-10"
        >
          <div className="grid gap-8">
            <div className="order-2 md:order-1">
              <CollectorForm form={checkout.form} formError={checkout.formError} />
            </div>

            <div className="order-1 md:order-2">
              <WalletPanel
                compact
                wallets={checkout.wallets}
                walletId={checkout.walletId}
                onSelectWallet={checkout.selectWallet}
                network={checkout.network}
                onSelectNetwork={checkout.selectNetwork}
                connection={checkout.connection}
                connectingType={checkout.connectingType}
                onConnect={checkout.connectWallet}
                onDisconnect={checkout.disconnectWallet}
              />
            </div>
          </div>

          <CheckoutSummary
            quote={checkout.quote}
            pending={checkout.quotePending}
            draftCoupon={checkout.draftCoupon}
            onDraftCouponChange={checkout.setDraftCoupon}
            appliedCoupon={checkout.appliedCoupon}
            couponError={checkout.couponError}
            onApplyCoupon={checkout.applyCoupon}
            onRemoveCoupon={checkout.removeCoupon}
            applyingCoupon={checkout.applyingCoupon}
            onPay={() => void checkout.submit()}
            payLabel={checkout.submitting ? 'Enviando…' : 'Revisar e pagar'}
            disabledPay={!checkout.canPay}
          />
        </form>
      )}

      <ReviewDialog
        review={checkout.review}
        onCancel={checkout.dismissReview}
        onConfirm={checkout.confirmReview}
        confirming={checkout.submitting}
      />
    </div>
  )
}

function EmptyCheckout() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-surface px-6 py-10 text-center">
      <h2 className="text-xl font-bold">Carrinho vazio</h2>
      <p className="mt-2 text-sm text-muted-foreground">Adicione NFTs ao carrinho antes de pagar.</p>
      <Button asChild className="mt-6">
        <Link to="/" hash="catalogo">
          Explorar mercado
        </Link>
      </Button>
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.75fr]">
      <div className="grid gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
