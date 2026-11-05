const IDEMPOTENCY_KEY = 'kurio:checkout-idempotency'
const PENDING_ORDER_KEY = 'kurio:pending-order'

function read(key: string) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/** Chave de idempotência da tentativa atual de checkout (sessionStorage). */
export const checkoutIdempotency = {
  get: () => read(IDEMPOTENCY_KEY),
  /** Gera uma chave nova ou reutiliza a existente se `reuse` for true. */
  ensure(reuse = true) {
    if (reuse) {
      const existing = read(IDEMPOTENCY_KEY)
      if (existing) return existing
    }
    const key = crypto.randomUUID()
    write(IDEMPOTENCY_KEY, key)
    return key
  },
  clear: () => write(IDEMPOTENCY_KEY, null),
  /** Troca a chave (ex.: após PRICE_CHANGED — o payload mudou). */
  rotate() {
    const key = crypto.randomUUID()
    write(IDEMPOTENCY_KEY, key)
    return key
  },
}

/** Pedido pendente em acompanhamento — sobrevive a refresh. */
export const pendingOrderStorage = {
  get: () => read(PENDING_ORDER_KEY),
  set: (orderId: string | null) => write(PENDING_ORDER_KEY, orderId),
  clear: () => write(PENDING_ORDER_KEY, null),
}
