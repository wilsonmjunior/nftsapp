import { Tabs } from 'radix-ui'
import type { ComponentType, ReactNode } from 'react'

import type { Session } from '@/api/contracts'
import { FacebookIcon, GoogleIcon } from '@/components/brand-icons'
import { UnavailableAction } from '@/components/unavailable-action'

import type { AuthMode } from '../auth-dialog-state'
import { LoginForm } from './login-form'
import { RegisterForm } from './register-form'

const COPY: Record<AuthMode, { title: string; tab: string; description: string; switchPrompt: string; switchAction: string }> = {
  login: {
    title: 'Entrar',
    tab: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
    switchPrompt: 'Novo na Kurio?',
    switchAction: 'Crie uma conta',
  },
  cadastro: {
    title: 'Criar perfil de colecionador',
    tab: 'Criar conta',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
    switchPrompt: 'Já tem uma conta?',
    switchAction: 'Entre',
  },
}

type TextComponent = ComponentType<{ className?: string; children: ReactNode }>

type AuthPanelProps = {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onSuccess: (session: Session) => void
  /** Título e descrição acessíveis do contêiner (h1 na página, DialogTitle no modal). */
  Title: TextComponent
  Description: TextComponent
}

export function AuthPanel({ mode, onModeChange, onSuccess, Title, Description }: AuthPanelProps) {
  const copy = COPY[mode]
  const other: AuthMode = mode === 'login' ? 'cadastro' : 'login'

  return (
    <Tabs.Root value={mode} onValueChange={(value) => onModeChange(value as AuthMode)} className="grid">
      <p aria-hidden="true" className="mb-20 text-center text-4xl font-bold tracking-[0.12em] md:hidden">
        KURIO
      </p>

      <Title className="mb-8 text-center text-xl font-bold md:sr-only">{copy.title}</Title>

      <Tabs.List aria-label="Acesso à conta" className="hidden items-center justify-center md:flex">
        {(['login', 'cadastro'] as const).map((value, index) => (
          <Tabs.Trigger
            key={value}
            value={value}
            className="px-2 text-lg font-medium transition-colors hover:text-brand-strong data-[state=active]:text-brand-strong"
          >
            {index > 0 && <span aria-hidden="true" className="mr-3 inline-block h-5 w-px bg-brand align-middle" />}
            {COPY[value].tab}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Description className="mx-auto mt-5 mb-6 hidden max-w-sm text-center text-xs leading-relaxed text-muted-foreground md:block">
        {copy.description}
      </Description>

      <div className="md:mx-auto md:w-full md:max-w-[352px]">
        <Tabs.Content value="login" tabIndex={-1} className="outline-none">
          <LoginForm onSuccess={onSuccess} />
        </Tabs.Content>
        <Tabs.Content value="cadastro" tabIndex={-1} className="outline-none">
          <RegisterForm onSuccess={onSuccess} />
        </Tabs.Content>
      </div>

      <div className="mt-10 grid gap-4 md:mt-5 md:gap-3 md:border-t md:border-border md:pt-2">
        <p className="flex items-center gap-3 text-sm md:justify-center md:text-xs">
          <span aria-hidden="true" className="h-px flex-1 bg-border md:hidden" />
          Ou continue com
          <span aria-hidden="true" className="h-px flex-1 bg-border md:hidden" />
        </p>
        <div className="grid gap-4 md:mx-auto md:w-full md:max-w-[352px] md:gap-3">
          <SocialButton icon={<GoogleIcon className="size-5" />}>Continuar com Google</SocialButton>
          <SocialButton icon={<FacebookIcon className="size-5 text-[#1877F2]" />}>Continuar com Facebook</SocialButton>
        </div>
      </div>

      <p className="mt-12 text-center text-muted-foreground md:hidden">
        {copy.switchPrompt}{' '}
        <button type="button" onClick={() => onModeChange(other)} className="underline-offset-4 hover:underline">
          {copy.switchAction}
        </button>
      </p>
    </Tabs.Root>
  )
}

function SocialButton({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <UnavailableAction className="flex h-10 items-center justify-center gap-3 rounded-md border border-border text-sm text-muted-foreground transition-colors hover:bg-surface-raised md:h-8 md:text-xs">
      {icon}
      {children}
    </UnavailableAction>
  )
}
