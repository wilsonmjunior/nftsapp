const KEY = 'kurio:cart-coupon'

export const couponStorage = {
  get(): string | null {
    try {
      return sessionStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(code: string | null) {
    try {
      if (!code) sessionStorage.removeItem(KEY)
      else sessionStorage.setItem(KEY, code)
    } catch {
      // Storage bloqueado: o cupom vale só enquanto a página estiver aberta.
    }
  },
}
