import { useQuery } from '@tanstack/react-query'

import { toApiError } from '@/api/errors'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/session/use-session'

import { AccountShell } from './account-shell'
import { walletsQueryOptions } from './queries'
import { WalletForm } from './wallet-form'

export function WalletsPage() {
  const { user } = useSession()
  const userId = user?.id ?? ''

  const wallets = useQuery({
    ...walletsQueryOptions(userId),
    enabled: Boolean(user),
  })

  return (
    <AccountShell title="Carteiras">
      {wallets.isPending ? (
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : wallets.isError ? (
        <p role="alert" className="text-required">
          {toApiError(wallets.error).message}
        </p>
      ) : (
        <div className="grid gap-8">
          <section className="rounded-xl border border-border bg-surface p-5 md:p-6">
            <WalletForm
              userId={userId}
              slot="primary"
              title="Carteira principal"
              wallet={wallets.data.primary}
            />
          </section>
          <section className="rounded-xl border border-border bg-surface p-5 md:p-6">
            <WalletForm
              userId={userId}
              slot="secondary"
              title="Carteira secundária"
              wallet={wallets.data.secondary}
              primary={wallets.data.primary}
            />
          </section>
        </div>
      )}
    </AccountShell>
  )
}
