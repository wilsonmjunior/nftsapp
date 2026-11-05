import type { UseFormReturn } from 'react-hook-form'

import type { CollectorInfo } from '@/api/contracts'
import { authInputClass, FormField } from '@/components/form-field'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/features/session/components/form-alert'

type CollectorFormProps = {
  form: UseFormReturn<CollectorInfo>
  formError: string | null
  id?: string
}

export function CollectorForm({ form, formError, id = 'collector-form' }: CollectorFormProps) {
  const { errors } = form.formState

  return (
    <div className="grid gap-4" id={id}>
      <h2 className="text-lg font-bold md:text-xl">Perfil do colecionador</h2>
      {formError && <FormAlert>{formError}</FormAlert>}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Nome de exibição" error={errors.displayName?.message}>
          {(control) => (
            <Input
              {...control}
              {...form.register('displayName')}
              placeholder="Nome de exibição"
              className={authInputClass}
              autoComplete="name"
            />
          )}
        </FormField>

        <FormField label="Nome de usuário" error={errors.username?.message}>
          {(control) => (
            <Input
              {...control}
              {...form.register('username')}
              placeholder="Nome de usuário"
              className={authInputClass}
              autoComplete="username"
            />
          )}
        </FormField>

        <FormField label="Nome do perfil" error={errors.profileName?.message}>
          {(control) => (
            <Input
              {...control}
              {...form.register('profileName')}
              placeholder="Nome do perfil"
              className={authInputClass}
            />
          )}
        </FormField>

        <FormField label="E-mail" error={errors.email?.message}>
          {(control) => (
            <Input
              {...control}
              {...form.register('email')}
              type="email"
              placeholder="contato@email.com"
              className={authInputClass}
              autoComplete="email"
            />
          )}
        </FormField>

        <FormField label="Código de indicação" error={errors.referralCode?.message}>
          {(control) => (
            <Input
              {...control}
              {...form.register('referralCode')}
              placeholder="Código de indicação"
              className={authInputClass}
              autoComplete="off"
            />
          )}
        </FormField>

        <FormField label="Nome ENS" error={errors.ensName?.message} hint="Sem o sufixo .eth">
          {(control) => (
            <Input
              {...control}
              {...form.register('ensName')}
              placeholder="nome"
              className={authInputClass}
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </FormField>
      </div>

      <FormField label="Observação" error={errors.note?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('note')}
            placeholder="Observação (opcional)"
            className={authInputClass}
          />
        )}
      </FormField>
    </div>
  )
}
