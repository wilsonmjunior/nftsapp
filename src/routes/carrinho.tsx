import { createFileRoute } from '@tanstack/react-router'

import { CartPage } from '@/features/cart/components/cart-page'

export const Route = createFileRoute('/carrinho')({
  head: () => ({
    meta: [
      { title: 'Carrinho — Kurio' },
      { name: 'description', content: 'Revise edições, quantidades e cupom antes de pagar no marketplace Kurio.' },
    ],
  }),
  component: CartPage,
})
