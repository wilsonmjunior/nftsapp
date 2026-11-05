import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { authApi } from '@/api/auth'
import { loginInput, type Session } from '@/api/contracts'
import { authInputClass, FormField } from '@/components/form-field'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UnavailableAction } from '@/components/unavailable-action'
import { applyApiErrors } from '@/lib/form-errors'

import { useSessionExpired } from '../expired-notice'
import { establishSession } from '../session-query'
import { SESSION_EXPIRED_MESSAGE } from '../session-sync'
import { FormAlert } from './form-alert'

export function LoginForm({ onSuccess }: { onSuccess: (session: Session) => void }) {
  const queryClient = useQueryClient()
  const expired = useSessionExpired()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    resolver: zodResolver(loginInput),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  })
  const { errors } = form.formState

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      establishSession(queryClient, response)
      onSuccess(response.session)
    },
    onError: (error) => setFormError(applyApiErrors(error, form.setError, ['email', 'password'])),
  })

  const submit = form.handleSubmit((values) => {
    setFormError(null)
    login.mutate(values)
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-3" aria-label="Entrar">
      {expired && !formError && <FormAlert tone="info">{SESSION_EXPIRED_MESSAGE}</FormAlert>}
      {formError && <FormAlert>{formError}</FormAlert>}

      <FormField label="E-mail" hideLabel error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('email')}
            type="email"
            autoComplete="email"
            placeholder="contato@email.com"
            className={authInputClass}
          />
        )}
      </FormField>

      <FormField label="Senha" hideLabel error={errors.password?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('password')}
            autoComplete="current-password"
            placeholder="Senha"
            className={authInputClass}
          />
        )}
      </FormField>

      <UnavailableAction className="justify-self-end text-sm text-brand-strong md:text-xs">
        Esqueceu a senha?
      </UnavailableAction>

      <Button type="submit" disabled={login.isPending} className="mt-4 h-14 rounded-lg text-base md:mt-2 md:h-10 md:text-sm">
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
