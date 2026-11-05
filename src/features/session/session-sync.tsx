import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { onUnauthorized } from '@/lib/http'
import { sessionToken } from '@/lib/session-token'

import { useAuthDialog } from './auth-dialog-state'
import { expiredNotice } from './expired-notice'
import { clearSession, PRIVATE_SCOPE, SESSION_KEY } from './session-query'

export const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Entre novamente para continuar de onde parou.'

/** Reage a 401 em qualquer requisição e a login/logout feitos em outra aba. */
export function SessionSync() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { open } = useAuthDialog()

  useEffect(
    () =>
      onUnauthorized(({ token }) => {
        // Resposta atrasada de uma sessão que já foi trocada não pode derrubar a atual.
        if (token !== sessionToken.get()) return

        const hadSession = Boolean(queryClient.getQueryData(SESSION_KEY))
        clearSession(queryClient)
        if (!hadSession) return

        expiredNotice.set(true)
        toast.warning(SESSION_EXPIRED_MESSAGE, { id: 'session-expired' })
        void open('login')
      }),
    [queryClient, open],
  )

  useEffect(
    () =>
      sessionToken.subscribe(async (_token, { external }) => {
        if (!external) return
        queryClient.removeQueries({ queryKey: [PRIVATE_SCOPE] })
        await queryClient.invalidateQueries({ queryKey: SESSION_KEY })
        // Reexecuta os guards: sair em outra aba tira esta aba das páginas privadas.
        await router.invalidate()
      }),
    [queryClient, router],
  )

  return null
}
