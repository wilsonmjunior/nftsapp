import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { Skeleton } from '@/components/ui/skeleton'
import { favoritesQueryOptions } from '@/features/favorites/queries'
import { requireAuth } from '@/features/session/guards'
import { useSession } from '@/features/session/use-session'

export const Route = createFileRoute('/favoritos')({
  staticData: { requiresAuth: true },
  beforeLoad: requireAuth,
  component: FavoritesPage,
})

/** Lista provisória; os cards do catálogo substituem esta lista na etapa do catálogo. */
function FavoritesPage() {
  const { user } = useSession()
  const favorites = useQuery({ ...favoritesQueryOptions(user?.id ?? ''), enabled: Boolean(user) })

  return (
    <div className="page-container grid gap-6 py-16">
      <h1 className="text-2xl font-bold">Favoritos</h1>

      {favorites.data ? (
        favorites.data.items.length > 0 ? (
          <ul aria-label="NFTs favoritados" className="grid max-w-md gap-2">
            {favorites.data.items.map((nft) => (
              <li key={nft.id} className="rounded-md bg-surface px-4 py-3">
                {nft.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Você ainda não favoritou nenhum NFT.</p>
        )
      ) : favorites.isError ? (
        <p role="alert">{favorites.error.message}</p>
      ) : (
        <div aria-busy="true" className="grid max-w-md gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}
    </div>
  )
}
