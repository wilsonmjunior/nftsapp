import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { quoteApi } from '@/api/commerce'
import type { CartLineInput, Network } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { useAnnounce } from '@/components/a11y/use-announce'

import { couponStorage } from './coupon-storage'
import { quoteKey } from './quote-query'

type UseCouponOptions = {
  owner: string
  lines: CartLineInput[]
  network: Network
}

export function useCoupon({ owner, lines, network }: UseCouponOptions) {
  const queryClient = useQueryClient()
  const announce = useAnnounce()
  const [draftCoupon, setDraftCoupon] = useState(() => couponStorage.get() ?? '')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(() => couponStorage.get())
  const [couponError, setCouponError] = useState<string | null>(null)

  const applyMutation = useMutation({
    mutationFn: async (code: string) => {
      const quote = await quoteApi.create({ items: lines, couponCode: code, network })
      return { quote, code }
    },
    onSuccess: ({ quote, code }) => {
      setAppliedCoupon(code)
      setDraftCoupon(code)
      setCouponError(null)
      couponStorage.set(code)
      queryClient.setQueryData(quoteKey({ owner, lines, couponCode: code, network }), quote)
      const message = `Cupom ${code} aplicado.`
      announce(message)
      toast.success(message)
    },
    onError: (error) => {
      const apiError = toApiError(error)
      setCouponError(apiError.fields.couponCode ?? apiError.message)
    },
  })

  function applyCoupon() {
    const code = draftCoupon.trim().toUpperCase()
    if (!code) {
      setCouponError('Informe um código promocional.')
      return
    }
    if (lines.length === 0) {
      setCouponError('Adicione itens ao carrinho antes de aplicar um cupom.')
      return
    }
    setCouponError(null)
    applyMutation.mutate(code)
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setDraftCoupon('')
    setCouponError(null)
    couponStorage.set(null)
    announce('Cupom removido.')
  }

  /** Cupom recusado numa cotação posterior (ex.: expirou): descarta o cupom e mantém o carrinho. */
  function dropIfRejected(error: unknown) {
    const apiError = toApiError(error)
    if (apiError.code !== 'COUPON_INVALID' && apiError.code !== 'COUPON_EXPIRED') return
    setCouponError(apiError.message)
    setAppliedCoupon(null)
    couponStorage.set(null)
  }

  return {
    draftCoupon,
    setDraftCoupon,
    appliedCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
    applyingCoupon: applyMutation.isPending,
    dropIfRejected,
  }
}
