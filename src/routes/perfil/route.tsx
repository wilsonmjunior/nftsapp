import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireAuth } from '@/features/session/guards'

export const Route = createFileRoute('/perfil')({
  staticData: { requiresAuth: true },
  beforeLoad: requireAuth,
  component: Outlet,
})
