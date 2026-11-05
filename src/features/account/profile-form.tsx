import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { accountApi } from '@/api/account'
import { updateProfileInput, type UpdateProfileInput, type User } from '@/api/contracts'
import { authInputClass, FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/features/session/components/form-alert'
import { SESSION_KEY } from '@/features/session/session-query'
import type { Session } from '@/api/contracts'
import { applyApiErrors } from '@/lib/form-errors'
import { useAnnounce } from '@/components/a11y/use-announce'

import { profileQueryOptions } from './queries'

type ProfileFormProps = {
  user: User
}

export function ProfileForm({ user }: ProfileFormProps) {
  const queryClient = useQueryClient()
  const announce = useAnnounce()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileInput),
    mode: 'onTouched',
    defaultValues: {
      displayName: user.displayName,
      username: user.username,
      email: user.email,
      ensName: user.ensName ?? '',
      walletNickname: user.walletNickname ?? '',
    },
  })

  useEffect(() => {
    form.reset({
      displayName: user.displayName,
      username: user.username,
      email: user.email,
      ensName: user.ensName ?? '',
      walletNickname: user.walletNickname ?? '',
    })
  }, [user, form])

  const save = useMutation({
    mutationFn: accountApi.updateProfile,
    onSuccess: (next) => {
      queryClient.setQueryData(profileQueryOptions(next.id).queryKey, next)
      queryClient.setQueryData<Session | null>(SESSION_KEY, (current) =>
        current ? { ...current, user: next } : current,
      )
      announce('Perfil atualizado.')
      toast.success('Perfil atualizado.')
      setFormError(null)
    },
    onError: (error) => {
      setFormError(
        applyApiErrors(error, form.setError, ['displayName', 'username', 'email', 'ensName', 'walletNickname']),
      )
    },
  })

  const { errors } = form.formState

  return (
    <form
      noValidate
      aria-label="Dados do perfil"
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        save.mutate(values)
      })}
    >
      <h2 className="text-lg font-bold">Dados do colecionador</h2>
      {formError && <FormAlert>{formError}</FormAlert>}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Nome de exibição" error={errors.displayName?.message}>
          {(control) => (
            <Input {...control} {...form.register('displayName')} className={authInputClass} autoComplete="name" />
          )}
        </FormField>
        <FormField label="Nome de usuário" error={errors.username?.message}>
          {(control) => (
            <Input {...control} {...form.register('username')} className={authInputClass} autoComplete="username" />
          )}
        </FormField>
        <FormField label="E-mail" error={errors.email?.message}>
          {(control) => (
            <Input
              {...control}
              {...form.register('email')}
              type="email"
              className={authInputClass}
              autoComplete="email"
            />
          )}
        </FormField>
        <FormField label="Apelido da carteira" error={errors.walletNickname?.message}>
          {(control) => (
            <Input {...control} {...form.register('walletNickname')} className={authInputClass} autoComplete="off" />
          )}
        </FormField>
        <FormField label="Nome ENS" error={errors.ensName?.message} hint="Sem o sufixo .eth" className="sm:col-span-2">
          {(control) => (
            <div className="flex items-center gap-2">
              <Input
                {...control}
                {...form.register('ensName')}
                className={authInputClass}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="shrink-0 text-sm text-muted-foreground">.eth</span>
            </div>
          )}
        </FormField>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={save.isPending || !form.formState.isDirty}>
        {save.isPending ? 'Salvando…' : 'Salvar perfil'}
      </Button>
    </form>
  )
}
