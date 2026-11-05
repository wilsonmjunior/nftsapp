import { createFileRoute } from '@tanstack/react-router'

import { WalletsPage } from '@/features/account/wallets-page'

export const Route = createFileRoute('/perfil/carteiras')({
  component: WalletsPage,
})
