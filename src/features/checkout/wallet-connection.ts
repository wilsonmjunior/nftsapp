import type { WalletType } from '@/api/contracts'

export type WalletConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'refused'

export const CONNECTABLE_WALLETS: Array<{ type: WalletType; label: string; hint: string }> = [
  { type: 'metamask', label: 'MetaMask', hint: 'Extensão ou app' },
  { type: 'walletconnect', label: 'WalletConnect', hint: 'QR Code' },
  { type: 'coinbase', label: 'Coinbase Wallet', hint: 'App ou extensão' },
]

/** Simula atraso e desfecho da conexão de carteira (sem extensão real). */
export function simulateWalletConnect(outcome: 'accept' | 'refuse' = 'accept') {
  return new Promise<'connected' | 'refused'>((resolve) => {
    window.setTimeout(() => resolve(outcome === 'accept' ? 'connected' : 'refused'), 700)
  })
}
