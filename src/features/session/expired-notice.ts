import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
let expired = false

/** Lembra que a última sessão expirou para explicar o motivo no formulário de login. */
export const expiredNotice = {
  get: () => expired,
  set(value: boolean) {
    if (value === expired) return
    expired = value
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useSessionExpired() {
  return useSyncExternalStore(expiredNotice.subscribe, expiredNotice.get)
}
