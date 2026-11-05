import { createFileRoute } from '@tanstack/react-router'

import { AuthPage } from '@/features/session/components/auth-page'
import { authPageSearch, requireGuest } from '@/features/session/guards'

export const Route = createFileRoute('/cadastro')({
  validateSearch: authPageSearch,
  beforeLoad: requireGuest,
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect } = Route.useSearch()
  return <AuthPage mode="cadastro" redirect={redirect} />
}
