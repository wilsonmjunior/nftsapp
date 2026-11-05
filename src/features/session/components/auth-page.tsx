import { useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import type { AuthMode } from '../auth-dialog-state'
import { safeRedirect } from '../guards'
import { welcome } from '../welcome'
import { AuthPanel } from './auth-panel'

function Title({ className, children }: { className?: string; children: ReactNode }) {
  return <h1 className={className}>{children}</h1>
}

function Description({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={className}>{children}</p>
}

export function AuthPage({ mode, redirect }: { mode: AuthMode; redirect: string | undefined }) {
  const navigate = useNavigate()

  return (
    <div className="px-7 pt-16 pb-12 md:page-container md:py-16">
      <div className="md:mx-auto md:max-w-[520px] md:rounded-lg md:border md:border-b-4 md:border-border md:border-b-brand md:bg-surface md:pt-10 md:pb-8">
        <AuthPanel
          mode={mode}
          onModeChange={(next) =>
            navigate({ to: next === 'login' ? '/login' : '/cadastro', search: { redirect }, replace: true })
          }
          onSuccess={(session) => {
            welcome(session, mode)
            void navigate({ href: safeRedirect(redirect), replace: true })
          }}
          Title={Title}
          Description={Description}
        />
      </div>
    </div>
  )
}
