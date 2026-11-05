import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { authApi } from '@/api/auth'
import { registerInput, type Session } from '@/api/contracts'
import { authInputClass, FormField } from '@/components/form-field'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { applyApiErrors } from '@/lib/form-errors'

import { establishSession } from '../session-query'
import { FormAlert } from './form-alert'

const FIELDS = ['username', 'email', 'password', 'confirmPassword'] as const

export function RegisterForm({ onSuccess }: { onSuccess: (session: Session) => void }) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    resolver: zodResolver(registerInput),
    mode: 'onTouched',
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: (response) => {
      establishSession(queryClient, response)
      onSuccess(response.session)
    },
    onError: (error) => setFormError(applyApiErrors(error, form.setError, FIELDS)),
  })

  const submit = form.handleSubmit((values) => {
    setFormError(null)
    register.mutate(values)
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-3" aria-label="Criar conta">
      {formError && <FormAlert>{formError}</FormAlert>}

      <FormField label="Nome de usuário" hideLabel error={errors.username?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('username')}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Nome de usuário"
            className={authInputClass}
          />
        )}
      </FormField>

      <FormField label="E-mail" hideLabel error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('email')}
            type="email"
            autoComplete="email"
            placeholder="Digite seu e-mail"
            className={authInputClass}
          />
        )}
      </FormField>

      <FormField
        label="Senha"
        hideLabel
        hint="Mínimo de 8 caracteres, com letras e números."
        error={errors.password?.message}
      >
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('password')}
            autoComplete="new-password"
            placeholder="Senha"
            className={authInputClass}
          />
        )}
      </FormField>

      <FormField label="Confirmar senha" hideLabel error={errors.confirmPassword?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('confirmPassword')}
            autoComplete="new-password"
            placeholder="Confirmar senha"
            className={authInputClass}
          />
        )}
      </FormField>

      <Button
        type="submit"
        disabled={register.isPending}
        className="mt-6 h-14 rounded-lg text-base md:mt-3 md:h-10 md:text-sm"
      >
        {register.isPending ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  )
}
