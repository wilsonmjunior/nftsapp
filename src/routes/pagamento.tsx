import { createFileRoute } from '@tanstack/react-router'

import { CheckoutPage } from '@/features/checkout/components/checkout-page'
import { requireAuth } from '@/features/session/guards'

export const Route = createFileRoute('/pagamento')({
  staticData: { requiresAuth: true },
  beforeLoad: requireAuth,
  component: CheckoutPage,
})
