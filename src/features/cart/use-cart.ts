import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'

import { cartApi } from '@/api/commerce'
import type { CartLineInput } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { useAnnounce } from '@/components/a11y/use-announce'
import { useSession } from '@/features/session/use-session'

import { guestCart } from './guest-cart'
import { cartQueryOptions } from './queries'

export function useCartItemCount() {
  const { user } = useSession()
  const guestCount = useSyncExternalStore(guestCart.subscribe, guestCart.itemCount, () => 0)
  const server = useQuery({
    ...cartQueryOptions(user?.id ?? ''),
    enabled: Boolean(user),
    select: (cart) => cart.itemCount,
  })
  return user ? (server.data ?? 0) : guestCount
}

type AddInput = CartLineInput & {
  /** Nome só para feedback; a API resolve o restante. */
  name: string
  maxPerOrder: number
}

export function useAddToCart() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const announce = useAnnounce()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationKey: ['cart', 'add'],
    mutationFn: async (input: AddInput) => {
      const line = { nftId: input.nftId, editionId: input.editionId, quantity: input.quantity }
      if (!user) {
        guestCart.add(line, input.maxPerOrder)
        return { itemCount: guestCart.itemCount() }
      }
      const cart = await cartApi.addItem(line)
      queryClient.setQueryData(cartQueryOptions(user.id).queryKey, cart)
      return cart
    },
    onSuccess: (_result, input) => {
      const message =
        input.quantity === 1
          ? `${input.name} entrou no carrinho.`
          : `${input.quantity} unidades de ${input.name} entraram no carrinho.`
      announce(message)
      toast.success(message, {
        action: {
          label: 'Ver carrinho',
          onClick: () => void navigate({ to: '/carrinho' }),
        },
      })
    },
    onError: (error) => {
      toast.error(toApiError(error).message)
    },
    onSettled: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: cartQueryOptions(user.id).queryKey })
    },
  })

  return {
    add: (input: AddInput) => mutation.mutateAsync(input),
    isPending: mutation.isPending,
  }
}

export async function mergeGuestCart(queryClient: QueryClient, userId: string) {
  const items = guestCart.get()
  if (items.length === 0) return
  try {
    const cart = await cartApi.merge(items)
    guestCart.clear()
    queryClient.setQueryData(cartQueryOptions(userId).queryKey, cart)
  } catch {
    // Mantém o carrinho local para nova tentativa na próxima sessão / página do carrinho.
  }
}
