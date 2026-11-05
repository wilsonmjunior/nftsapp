import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { favoritesApi } from '@/api/commerce'
import type { FavoritesResponse, NftSummary } from '@/api/contracts'
import { useAnnounce } from '@/components/a11y/use-announce'
import { useAuthDialog } from '@/features/session/auth-dialog-state'
import { useSession } from '@/features/session/use-session'

import { favoritesQueryOptions } from './queries'

const NO_FAVORITES: ReadonlySet<string> = new Set()
const FAVORITE_MUTATION_KEY = ['favorite']

function applyFavorite(data: FavoritesResponse, nft: NftSummary, favorite: boolean): FavoritesResponse {
  const ids = data.ids.filter((id) => id !== nft.id)
  const items = data.items.filter((item) => item.id !== nft.id)
  return favorite ? { ids: [nft.id, ...ids], items: [nft, ...items] } : { ids, items }
}

export function useFavoriteIds() {
  const { user } = useSession()
  const query = useQuery({
    ...favoritesQueryOptions(user?.id ?? ''),
    enabled: Boolean(user),
    select: (data) => new Set(data.ids),
  })
  return query.data ?? NO_FAVORITES
}

type Variables = { nft: NftSummary; favorite: boolean }

export function useFavorite(nft: NftSummary) {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const announce = useAnnounce()
  const { open: openAuth } = useAuthDialog()
  const isFavorite = useFavoriteIds().has(nft.id)

  const mutation = useMutation({
    // Cliques seguidos no mesmo NFT rodam em fila, na ordem em que aconteceram.
    mutationKey: FAVORITE_MUTATION_KEY,
    scope: { id: `favorite:${nft.id}` },
    mutationFn: ({ nft, favorite }: Variables) => (favorite ? favoritesApi.add(nft.id) : favoritesApi.remove(nft.id)),
    onMutate: async ({ nft, favorite }) => {
      if (!user) return
      const { queryKey } = favoritesQueryOptions(user.id)
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData(queryKey, (data) => data && applyFavorite(data, nft, favorite))
      announce(favorite ? `${nft.name} adicionado aos favoritos.` : `${nft.name} removido dos favoritos.`)
    },
    onError: (_error, variables) => {
      if (user) {
        // Desfaz só este NFT: um snapshot inteiro apagaria outros favoritos alterados ao mesmo tempo.
        const { queryKey } = favoritesQueryOptions(user.id)
        queryClient.setQueryData(queryKey, (data) => data && applyFavorite(data, variables.nft, !variables.favorite))
      }
      toast.error(`Não foi possível atualizar os favoritos. ${variables.nft.name} voltou ao estado anterior.`, {
        id: `favorite-error:${variables.nft.id}`,
        action: { label: 'Tentar novamente', onClick: () => mutation.mutate(variables) },
      })
    },
    onSettled: () => {
      // Reconcilia só quando for o último toggle em andamento, para não sobrescrever os otimistas pendentes.
      if (user && queryClient.isMutating({ mutationKey: FAVORITE_MUTATION_KEY }) <= 1) {
        void queryClient.invalidateQueries({ queryKey: favoritesQueryOptions(user.id).queryKey })
      }
    },
  })

  function toggle() {
    if (!user) {
      toast.info('Entre na sua conta para salvar favoritos.', { id: 'favorite-auth' })
      void openAuth('login')
      return
    }
    mutation.mutate({ nft, favorite: !isFavorite })
  }

  return { isFavorite, toggle }
}
