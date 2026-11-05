import { toast } from 'sonner'

import type { Session } from '@/api/contracts'

import type { AuthMode } from './auth-dialog-state'

export function welcome(session: Session, mode: AuthMode) {
  const name = session.user.displayName
  toast.success(mode === 'login' ? `Boas-vindas de volta, ${name}!` : `Conta criada. Boas-vindas, ${name}!`)
}
