import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { accountApi } from '@/api/account'
import { changePasswordInput, type ChangePasswordInput } from '@/api/contracts'
import { useAnnounce } from '@/components/a11y/use-announce'
import { authInputClass, FormField } from '@/components/form-field'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/features/session/components/form-alert'
import { applyApiErrors } from '@/lib/form-errors'

export function PasswordForm() {
  const announce = useAnnounce()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordInput),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const save = useMutation({
    mutationFn: accountApi.changePassword,
    onSuccess: () => {
      form.reset()
      announce('Senha alterada.')
      toast.success('Senha alterada.')
      setFormError(null)
    },
    onError: (error) => {
      setFormError(
        applyApiErrors(error, form.setError, ['currentPassword', 'newPassword', 'confirmPassword']),
      )
    },
  })

  const { errors } = form.formState

  return (
    <form
      noValidate
      aria-label="Alterar senha"
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        save.mutate(values)
      })}
    >
      <h2 className="text-lg font-bold">Alterar senha</h2>
      {formError && <FormAlert>{formError}</FormAlert>}

      <FormField label="Senha atual" error={errors.currentPassword?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('currentPassword')}
            className={authInputClass}
            autoComplete="current-password"
            placeholder="Senha atual"
          />
        )}
      </FormField>
      <FormField label="Nova senha" error={errors.newPassword?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('newPassword')}
            className={authInputClass}
            autoComplete="new-password"
            placeholder="Nova senha"
          />
        )}
      </FormField>
      <FormField label="Confirmar nova senha" error={errors.confirmPassword?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...form.register('confirmPassword')}
            className={authInputClass}
            autoComplete="new-password"
            placeholder="Confirmar nova senha"
          />
        )}
      </FormField>

      <Button type="submit" className="w-full sm:w-auto" disabled={save.isPending}>
        {save.isPending ? 'Salvando…' : 'Atualizar senha'}
      </Button>
    </form>
  )
}
