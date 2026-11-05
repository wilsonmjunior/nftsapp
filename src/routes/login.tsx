import { createFileRoute } from '@tanstack/react-router'

import { AuthPage } from '@/features/session/components/auth-page'
import { authPageSearch, requireGuest } from '@/features/session/guards'

export const Route = createFileRoute('/login')({
  validateSearch: authPageSearch,
  beforeLoad: requireGuest,
  head: () => ({
    meta: [
      { title: 'Entrar — Kurio' },
      { name: 'description', content: 'Acesse sua conta Kurio para favoritos, carrinho e checkout com carteira.' },
    ],
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  return <AuthPage mode="login" redirect={redirect} />
}
