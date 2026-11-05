import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

import { useAuthDialog, useIsProtectedRoute } from '../auth-dialog-state'
import { useSession } from '../use-session'
import { welcome } from '../welcome'
import { AuthPanel } from './auth-panel'

const AUTH_PAGES = ['/login', '/cadastro']

/**
 * Login e cadastro sobre a página atual (`?auth=`). Mantém a tela de origem montada,
 * então formulários em andamento (ex.: checkout) continuam preenchidos após entrar.
 */
export function AuthDialog() {
  const mode = useSearch({ strict: false, select: (search) => search.auth })
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { status } = useSession()
  const onProtectedRoute = useIsProtectedRoute()
  const { switchMode, close } = useAuthDialog()

  if (AUTH_PAGES.includes(pathname)) return null

  const open = Boolean(mode) && status !== 'authenticated'

  function dismiss() {
    if (onProtectedRoute && status !== 'authenticated') {
      void navigate({ to: '/', replace: true })
      return
    }
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="max-h-svh max-w-none gap-0 overflow-y-auto rounded-none border-0 bg-page px-7 py-16 max-md:h-svh max-md:w-full md:max-w-[520px] md:rounded-lg md:border md:border-b-4 md:border-border md:border-b-brand md:bg-surface md:px-0 md:pt-10 md:pb-8">
        {mode && (
          <AuthPanel
            mode={mode}
            onModeChange={switchMode}
            onSuccess={(session) => {
              welcome(session, mode)
              close()
            }}
            Title={DialogTitle}
            Description={DialogDescription}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
