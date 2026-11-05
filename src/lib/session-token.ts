const STORAGE_KEY = 'kurio:session-token'

type Listener = (token: string | null, origin: { external: boolean }) => void

const listeners = new Set<Listener>()

function read() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

let current = read()

export const sessionToken = {
  get: () => current,
  set(token: string | null) {
    if (token === current) return
    current = token
    try {
      if (token) localStorage.setItem(STORAGE_KEY, token)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Sem storage (modo privado restrito): a sessão vale só para a aba.
    }
    listeners.forEach((listener) => listener(token, { external: false }))
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

if (typeof window !== 'undefined') {
  // Login ou logout em outra aba.
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    current = event.newValue
    listeners.forEach((listener) => listener(current, { external: true }))
  })
}
