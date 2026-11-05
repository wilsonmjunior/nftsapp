import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, CircleAlert } from 'lucide-react'
import { useEffect } from 'react'

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
import { checkoutIdempotency, pendingOrderStorage } from '@/features/checkout/checkout-storage'
import { orderQueryOptions } from '@/features/checkout/queries'
import { useSession } from '@/features/session/use-session'

import { OrderReceipt } from './order-receipt'

type OrderStatusPageProps = {
  orderId: string
}

export function OrderStatusPage({ orderId }: OrderStatusPageProps) {
  const { user } = useSession()
  const userId = user?.id ?? ''

  const orderQuery = useQuery({
    ...orderQueryOptions(userId, orderId),
    enabled: Boolean(user),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 1_500 : false),
  })

  const order = orderQuery.data

  useEffect(() => {
    if (!order) return
    if (order.status === 'pending') {
      pendingOrderStorage.set(order.id)
      return
    }
    pendingOrderStorage.clear()
    checkoutIdempotency.clear()
  }, [order])

  return (
    <div className="relative min-h-[70vh] pb-[calc(var(--bottom-nav-height)+1rem)] pt-4 md:pb-16 md:pt-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(210,138,76,0.12),transparent_55%)]"
      />

      <div className="page-container relative">
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
                <BreadcrumbPage>Confirmação do pedido</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="relative flex w-full items-center justify-center md:hidden">
            <Link
              to="/"
              aria-label="Voltar ao início"
              className="absolute left-0 grid size-10 place-items-center rounded-full border border-border"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
            <p className="text-lg font-bold">Pedido</p>
          </div>
        </div>

        {orderQuery.isPending ? (
          <div className="mx-auto max-w-lg">
            <Skeleton className="h-[28rem] w-full rounded-2xl" />
          </div>
        ) : orderQuery.isError || !order ? (
          <NotFoundReceipt />
        ) : (
          <div className="flex justify-center px-0 md:px-4">
            <OrderReceipt order={order} />
          </div>
        )}
      </div>
    </div>
  )
}

function NotFoundReceipt() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface px-6 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <CircleAlert className="mx-auto size-10 text-required" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-bold">Pedido não encontrado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esse recibo não existe ou pertence a outra conta.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
