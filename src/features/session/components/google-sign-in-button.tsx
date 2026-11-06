import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { authApi } from '@/api/auth'
import type { Session } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { GoogleIcon } from '@/components/brand-icons'
import { UnavailableAction } from '@/components/unavailable-action'
import { isGoogleSignInConfigured, requestGoogleIdToken } from '@/lib/google-identity'

import { establishSession } from '../session-query'

const BUTTON_CLASS =
  'flex h-10 w-full items-center justify-center gap-3 rounded-md border border-border text-sm text-muted-foreground transition-colors hover:bg-surface-raised disabled:cursor-wait disabled:opacity-70 md:h-8 md:text-xs'

type GoogleSignInButtonProps = {
  onSuccess: (session: Session) => void
}

export function GoogleSignInButton({ onSuccess }: GoogleSignInButtonProps) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const login = useMutation({
    mutationFn: authApi.loginWithGoogle,
    onSuccess: (response) => {
      establishSession(queryClient, response)
      onSuccess(response.session)
    },
  })

  if (!isGoogleSignInConfigured()) {
    return (
      <UnavailableAction className={BUTTON_CLASS}>
        <GoogleIcon className="size-5" />
        Continuar com Google
      </UnavailableAction>
    )
  }

  const signInWithGoogle = async () => {
    if (busy || login.isPending) return
    setBusy(true)
    try {
      const idToken = await requestGoogleIdToken()
      await login.mutateAsync({ idToken })
    } catch (error) {
      const message = error instanceof Error ? error.message : toApiError(error).message
      if (!/cancelado/i.test(message)) toast.error(message || 'Não foi possível entrar com Google.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" onClick={() => void signInWithGoogle()} disabled={busy || login.isPending} className={BUTTON_CLASS}>
      <GoogleIcon className="size-5" />
      {busy || login.isPending ? 'Entrando com Google…' : 'Continuar com Google'}
    </button>
  )
}
