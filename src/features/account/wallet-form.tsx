import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { accountApi } from '@/api/account'
import {
  NETWORK_LABELS,
  WALLET_TYPE_LABELS,
  walletInput,
  type Network,
  type Wallet,
  type WalletInput,
  type WalletSlot,
  type WalletType,
} from '@/api/contracts'
import { useAnnounce } from '@/components/a11y/use-announce'
import { authInputClass, FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormAlert } from '@/features/session/components/form-alert'
import { applyApiErrors } from '@/lib/form-errors'

import { walletsQueryOptions } from './queries'

const NETWORKS = Object.keys(NETWORK_LABELS) as Network[]
const TYPES = Object.keys(WALLET_TYPE_LABELS) as WalletType[]

const emptyWallet = (fallback: Partial<WalletInput> = {}): WalletInput => ({
  displayName: '',
  nickname: '',
  network: 'ethereum',
  profileName: '',
  address: '',
  secondaryAddress: '',
  type: 'metamask',
  referralCode: '',
  email: '',
  ensName: '',
  ...fallback,
})

function toValues(wallet: Wallet | null | undefined, fallback: Partial<WalletInput> = {}): WalletInput {
  if (!wallet) return emptyWallet(fallback)
  return {
    displayName: wallet.displayName,
    nickname: wallet.nickname,
    network: wallet.network,
    profileName: wallet.profileName,
    address: wallet.address,
    secondaryAddress: wallet.secondaryAddress || '',
    type: wallet.type,
    referralCode: wallet.referralCode,
    email: wallet.email,
    ensName: wallet.ensName,
  }
}

type WalletFormProps = {
  userId: string
  slot: WalletSlot
  title: string
  wallet: Wallet | null
  /** Usado no checkbox "igual à principal". */
  primary?: Wallet | null
}

export function WalletForm({ userId, slot, title, wallet, primary }: WalletFormProps) {
  const queryClient = useQueryClient()
  const announce = useAnnounce()
  const [formError, setFormError] = useState<string | null>(null)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)

  const form = useForm<WalletInput>({
    resolver: zodResolver(walletInput),
    mode: 'onTouched',
    defaultValues: toValues(wallet),
  })

  useEffect(() => {
    form.reset(toValues(wallet))
    setSameAsPrimary(false)
  }, [wallet, form])

  const save = useMutation({
    mutationFn: (input: WalletInput) => accountApi.saveWallet(slot, input),
    onSuccess: (saved) => {
      queryClient.setQueryData(walletsQueryOptions(userId).queryKey, (current) => {
        if (!current) return { primary: saved.slot === 'primary' ? saved : null, secondary: saved.slot === 'secondary' ? saved : null }
        return { ...current, [saved.slot]: saved }
      })
      announce(`Carteira ${title.toLowerCase()} salva.`)
      toast.success(`Carteira ${title.toLowerCase()} salva.`)
      setFormError(null)
      form.reset(toValues(saved))
    },
    onError: (error) => {
      setFormError(
        applyApiErrors(error, form.setError, [
          'displayName',
          'nickname',
          'network',
          'profileName',
          'address',
          'secondaryAddress',
          'type',
          'referralCode',
          'email',
          'ensName',
        ]),
      )
    },
  })

  function applySameAsPrimary(checked: boolean) {
    setSameAsPrimary(checked)
    if (!checked || !primary) return
    form.reset({
      ...toValues(primary),
      nickname: form.getValues('nickname') || `${primary.nickname} (cópia)`,
      // Endereço precisa ser diferente — deixa em branco para o usuário preencher.
      address: '',
      secondaryAddress: primary.secondaryAddress || '',
    })
  }

  const { errors } = form.formState
  const selectClass =
    'h-12 w-full rounded-lg border border-border bg-transparent px-4 text-sm outline-none focus-visible:border-brand md:h-10 md:rounded-md'

  return (
    <form
      noValidate
      aria-label={title}
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        save.mutate(values)
      })}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {wallet && (
          <p className="font-mono text-xs text-subtle">
            {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
          </p>
        )}
      </div>

      {slot === 'secondary' && primary && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={sameAsPrimary}
            onCheckedChange={(value) => applySameAsPrimary(value === true)}
            aria-label="Igual à carteira principal"
          />
          <span>Igual à carteira principal</span>
        </label>
      )}

      {formError && <FormAlert>{formError}</FormAlert>}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Nome de exibição" error={errors.displayName?.message}>
          {(control) => <Input {...control} {...form.register('displayName')} className={authInputClass} />}
        </FormField>
        <FormField label="Apelido" error={errors.nickname?.message}>
          {(control) => <Input {...control} {...form.register('nickname')} className={authInputClass} />}
        </FormField>
        <FormField label="Nome do perfil" error={errors.profileName?.message}>
          {(control) => <Input {...control} {...form.register('profileName')} className={authInputClass} />}
        </FormField>
        <FormField label="E-mail" error={errors.email?.message}>
          {(control) => (
            <Input {...control} {...form.register('email')} type="email" className={authInputClass} autoComplete="email" />
          )}
        </FormField>
        <FormField label="Rede" error={errors.network?.message}>
          {(control) => (
            <select {...control} {...form.register('network')} className={selectClass}>
              {NETWORKS.map((item) => (
                <option key={item} value={item}>
                  {NETWORK_LABELS[item]}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Tipo de carteira" error={errors.type?.message}>
          {(control) => (
            <select {...control} {...form.register('type')} className={selectClass}>
              {TYPES.map((item) => (
                <option key={item} value={item}>
                  {WALLET_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Endereço 0x" error={errors.address?.message} className="sm:col-span-2">
          {(control) => (
            <Input
              {...control}
              {...form.register('address')}
              className={authInputClass}
              spellCheck={false}
              autoComplete="off"
              placeholder="0x…"
            />
          )}
        </FormField>
        <FormField label="Endereço secundário" error={errors.secondaryAddress?.message} hint="Opcional">
          {(control) => (
            <Input {...control} {...form.register('secondaryAddress')} className={authInputClass} autoComplete="off" />
          )}
        </FormField>
        <FormField label="Código de indicação" error={errors.referralCode?.message}>
          {(control) => <Input {...control} {...form.register('referralCode')} className={authInputClass} />}
        </FormField>
        <FormField label="Nome ENS" error={errors.ensName?.message} hint="Sem o sufixo .eth" className="sm:col-span-2">
          {(control) => (
            <div className="flex items-center gap-2">
              <Input {...control} {...form.register('ensName')} className={authInputClass} spellCheck={false} />
              <span className="shrink-0 text-sm text-muted-foreground">.eth</span>
            </div>
          )}
        </FormField>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={save.isPending}>
        {save.isPending ? 'Salvando…' : wallet ? 'Salvar carteira' : 'Cadastrar carteira'}
      </Button>
      {!wallet && slot === 'secondary' && (
        <Label className="text-xs text-muted-foreground">Ainda sem carteira secundária — preencha e salve para criar.</Label>
      )}
    </form>
  )
}
