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

import { useCartPage } from '../use-cart-page'
import { AlsoViewed } from './also-viewed'
import { CartLine } from './cart-line'
import { CartSummary } from './cart-summary'

export function CartPage() {
  const cart = useCartPage()

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
                <Link to="/" hash="catalogo">
                  Mercado
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Carrinho</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="relative flex w-full items-center justify-center md:hidden">
          <Link
            to="/"
            hash="catalogo"
            aria-label="Voltar ao mercado"
            className="absolute left-0 grid size-10 place-items-center rounded-full border border-border"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <h1 className="text-lg font-bold">Carrinho de NFTs</h1>
        </div>
        <h1 className="hidden text-2xl font-bold md:block">Carrinho</h1>
      </div>

      {cart.isLoading ? (
        <CartSkeleton />
      ) : cart.isEmpty ? (
        <EmptyCart />
      ) : (
        <>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)] lg:items-start lg:gap-10">
            <div>
              <div className="mb-2 hidden grid-cols-[minmax(0,1.4fr)_0.7fr_0.9fr_0.7fr_auto] gap-6 border-b border-border pb-3 text-sm text-muted-foreground md:grid">
                <p>NFTs</p>
                <p>Preço</p>
                <p>Edições</p>
                <p>Total</p>
                <p className="sr-only">Remover</p>
              </div>
              <ul className="grid gap-0">
                {cart.items.map((item) => (
                  <li key={item.id}>
                    <CartLine
                      item={item}
                      disabled={cart.isUpdating}
                      onQuantityChange={(quantity) => cart.updateQuantity(item, quantity)}
                      onRemove={() => cart.removeItem(item)}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <CartSummary
              quote={cart.quote}
              pending={cart.quotePending}
              draftCoupon={cart.draftCoupon}
              onDraftCouponChange={cart.setDraftCoupon}
              appliedCoupon={cart.appliedCoupon}
              couponError={cart.couponError}
              onApplyCoupon={cart.applyCoupon}
              onRemoveCoupon={cart.removeCoupon}
              applyingCoupon={cart.applyingCoupon}
              onCheckout={cart.checkout}
              checkoutLabel={cart.user ? 'Finalizar compra' : 'Conectar e finalizar'}
              disabledCheckout={Boolean(cart.quote && !cart.quote.purchasable)}
            />
          </div>

          <AlsoViewed excludeIds={cart.items.map((item) => item.nftId)} />
        </>
      )}
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex min-h-[40svh] flex-col items-center justify-center gap-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Seu carrinho está vazio</h2>
      <p className="max-w-md text-muted-foreground">
        Explore o mercado e adicione edições disponíveis. Os itens de visitante ficam salvos neste navegador.
      </p>
      <Button asChild className="mt-2">
        <Link to="/" hash="catalogo">
          Explorar NFTs
        </Link>
      </Button>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_0.7fr]" aria-busy="true" aria-label="Carregando carrinho">
      <div className="grid gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-md" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  )
}
