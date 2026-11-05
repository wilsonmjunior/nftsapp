import { createFileRoute } from '@tanstack/react-router'

import { OrderStatusPage } from '@/features/orders/order-status-page'
import { requireAuth } from '@/features/session/guards'

export const Route = createFileRoute('/pedidos/$orderId')({
  staticData: { requiresAuth: true },
  beforeLoad: requireAuth,
  component: PedidoPage,
})

function PedidoPage() {
  const { orderId } = Route.useParams()
  return <OrderStatusPage orderId={orderId} />
}
