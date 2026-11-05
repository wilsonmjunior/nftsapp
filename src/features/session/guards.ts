import type { QueryClient } from '@tanstack/react-query'
import { redirect, type ParsedLocation } from '@tanstack/react-router'
import { z } from 'zod'

import { sessionQueryOptions } from './session-query'

const AUTH_PATHS = ['/login', '/cadastro']

/** Aceita só caminhos internos, para o `redirect` não virar um open redirect. */
export function safeRedirect(value: string | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  if (AUTH_PATHS.some((path) => value === path || value.startsWith(`${path}?`))) return '/'
  return value
}

export const authPageSearch = z.object({
  redirect: z.string().optional().catch(undefined),
})

type GuardContext = { context: { queryClient: QueryClient }; location: ParsedLocation }

export async function requireAuth({ context, location }: GuardContext) {
  const session = await context.queryClient.fetchQuery(sessionQueryOptions())
  if (session) return { session }

  // Sessão expirou com a página aberta: o modal de login fica sobre ela para não perder o que estava em andamento.
  const { auth } = location.search as { auth?: string }
  if (auth) return { session: null }

  throw redirect({ to: '/login', search: { redirect: location.href } })
}

export async function requireGuest({
  context,
  search,
}: {
  context: { queryClient: QueryClient }
  search: { redirect?: string }
}) {
  const session = await context.queryClient.fetchQuery(sessionQueryOptions())
  if (session) throw redirect({ href: safeRedirect(search.redirect), replace: true })
}
