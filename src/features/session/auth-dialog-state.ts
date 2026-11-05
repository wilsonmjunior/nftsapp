import { useMatches, useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'

export const AUTH_MODES = ['login', 'cadastro'] as const
export type AuthMode = (typeof AUTH_MODES)[number]

/** Search param global: `?auth=login` abre o modal de acesso sobre a página atual. */
export const rootSearch = z.object({
  auth: z.enum(AUTH_MODES).optional().catch(undefined),
})

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    requiresAuth?: boolean
  }

  interface HistoryState {
    authDialog?: boolean
  }
}

export function useIsProtectedRoute() {
  return useMatches({ select: (matches) => matches.some((match) => match.staticData.requiresAuth) })
}

export function useAuthDialog() {
  const navigate = useNavigate()
  const router = useRouter()

  const open = useCallback(
    (mode: AuthMode = 'login') =>
      navigate({ to: '.', search: (prev) => ({ ...prev, auth: mode }), state: { authDialog: true } }),
    [navigate],
  )

  const switchMode = useCallback(
    (mode: AuthMode) =>
      navigate({
        to: '.',
        search: (prev) => ({ ...prev, auth: mode }),
        state: (prev) => prev,
        replace: true,
      }),
    [navigate],
  )

  const close = useCallback(() => {
    // Aberto por um clique nesta aba: voltar no histórico fecha sem deixar uma entrada com o modal.
    if (router.state.location.state.authDialog) {
      router.history.back()
      return
    }
    void navigate({ to: '.', search: (prev) => ({ ...prev, auth: undefined }), replace: true })
  }, [navigate, router])

  return { open, switchMode, close }
}
