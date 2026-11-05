import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { authApi } from '@/api/auth'

import { useIsProtectedRoute } from './auth-dialog-state'
import { clearSession } from './session-query'

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const onProtectedRoute = useIsProtectedRoute()

  return useMutation({
    // Revogar no servidor é melhor esforço: offline, a sessão local é encerrada do mesmo jeito.
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: async () => {
      if (onProtectedRoute) await navigate({ to: '/' })
      clearSession(queryClient)
      toast.success('Você saiu da sua conta.')
    },
  })
}
