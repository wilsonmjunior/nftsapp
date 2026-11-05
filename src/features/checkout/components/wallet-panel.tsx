import { Check, Link2Off, Loader2 } from 'lucide-react'

import {
  NETWORK_LABELS,
  WALLET_TYPE_LABELS,
  type Network,
  type Wallet,
  type WalletType,
} from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from 'cn'

import { CONNECTABLE_WALLETS, type WalletConnectionStatus } from '../wallet-connection'

type WalletPanelProps = {
  wallets: Wallet[]
  walletId: string | null
  onSelectWallet: (id: string) => void
  network: Network
  onSelectNetwork: (network: Network) => void
  connection: WalletConnectionStatus
  connectingType: WalletType | null
  onConnect: (type: WalletType, outcome?: 'accept' | 'refuse') => void
  onDisconnect: () => void
  compact?: boolean
}

const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']

function shortAddress(address: string) {
  if (address.length < 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function WalletPanel({
  wallets,
  walletId,
  onSelectWallet,
  network,
  onSelectNetwork,
  connection,
  connectingType,
  onConnect,
  onDisconnect,
  compact,
}: WalletPanelProps) {
  const selected = wallets.find((item) => item.id === walletId)

  return (
    <section aria-labelledby="pagamento-carteira-title" className="grid gap-4">
      <div>
        <h2 id="pagamento-carteira-title" className="text-lg font-bold md:text-xl">
          {compact ? 'Pagamento com carteira' : 'Carteira e rede'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Conexão simulada — sem extensão real de carteira.
        </p>
      </div>

      {wallets.length === 0 ? (
        <p role="status" className="rounded-lg border border-border bg-page px-4 py-3 text-sm text-muted-foreground">
          Nenhuma carteira cadastrada. Cadastre uma em Perfil → Carteiras antes de pagar.
        </p>
      ) : (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Carteira cadastrada</legend>
          {wallets.map((wallet) => {
            const active = wallet.id === walletId
            return (
              <label
                key={wallet.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors',
                  active ? 'border-brand bg-brand/10' : 'border-border bg-page hover:border-brand/50',
                )}
              >
                <input
                  type="radio"
                  name="checkout-wallet"
                  value={wallet.id}
                  checked={active}
                  onChange={() => onSelectWallet(wallet.id)}
                  className="mt-1 accent-[var(--brand)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {wallet.nickname}
                    <span className="text-xs font-normal text-muted-foreground">
                      {WALLET_TYPE_LABELS[wallet.type]} · {NETWORK_LABELS[wallet.network]}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-xs text-subtle">
                    {shortAddress(wallet.address)}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>
      )}

      <div className="grid gap-2">
        <Label htmlFor="checkout-network">Rede</Label>
        <select
          id="checkout-network"
          value={network}
          onChange={(event) => onSelectNetwork(event.target.value as Network)}
          className="h-11 w-full rounded-lg border border-border bg-page px-3 text-sm outline-none focus-visible:border-brand"
        >
          {NETWORKS.map((item) => (
            <option key={item} value={item}>
              {NETWORK_LABELS[item]}
            </option>
          ))}
        </select>
      </div>

      {connection === 'connected' && selected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/40 bg-brand/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Check className="size-4 text-brand" aria-hidden="true" />
            <span>
              Conectada · {WALLET_TYPE_LABELS[selected.type]} · {shortAddress(selected.address)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onDisconnect}>
              <Link2Off className="size-4" aria-hidden="true" />
              Desconectar
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <p className="text-sm font-medium">Conectar com</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {CONNECTABLE_WALLETS.map((option) => {
              const busy = connection === 'connecting' && connectingType === option.type
              return (
                <div key={option.type} className="grid gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 justify-start gap-2"
                    disabled={!selected || connection === 'connecting'}
                    onClick={() => onConnect(option.type, 'accept')}
                    aria-label={`Conectar ${option.label}`}
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                    <span className="text-left">
                      <span className="block font-medium">{option.label}</span>
                      <span className="block text-xs font-normal text-muted-foreground">{option.hint}</span>
                    </span>
                  </Button>
                  <button
                    type="button"
                    className="text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
                    disabled={!selected || connection === 'connecting'}
                    onClick={() => onConnect(option.type, 'refuse')}
                  >
                    Simular recusa ({option.label})
                  </button>
                </div>
              )
            })}
          </div>
          {connection === 'refused' && (
            <p role="alert" className="text-sm text-required">
              A carteira recusou a conexão. Tente novamente.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
