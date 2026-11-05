import { googleClientId } from '@/env'

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const GIS_SCRIPT_ID = 'kurio-google-gsi'

type CredentialResponse = {
  credential?: string
  select_by?: string
}

type PromptNotification = {
  isNotDisplayed: () => boolean
  isSkippedMoment: () => boolean
  isDismissedMoment: () => boolean
  getNotDisplayedReason: () => string
  getSkippedReason: () => string
  getDismissedReason: () => string
}

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string
    callback: (response: CredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    use_fedcm_for_prompt?: boolean
  }) => void
  prompt: (momentListener?: (notification: PromptNotification) => void) => void
  cancel: () => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

let scriptPromise: Promise<void> | null = null
let initializedClientId: string | null = null
let pendingCredential: {
  resolve: (credential: string) => void
  reject: (error: Error) => void
} | null = null

function loadGisScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GIS_SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o Google Identity.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GIS_SCRIPT_ID
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Falha ao carregar o Google Identity.'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

function ensureInitialized(clientId: string) {
  if (!window.google?.accounts?.id) throw new Error('Google Identity indisponível.')
  if (initializedClientId === clientId) return

  window.google.accounts.id.initialize({
    client_id: clientId,
    auto_select: false,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true,
    callback: (response) => {
      const pending = pendingCredential
      pendingCredential = null
      if (!pending) return
      if (response.credential) pending.resolve(response.credential)
      else pending.reject(new Error('O Google não retornou uma credencial.'))
    },
  })
  initializedClientId = clientId
}

export async function requestGoogleIdToken(): Promise<string> {
  const clientId = googleClientId()
  if (!clientId) throw new Error('Login com Google não está configurado.')

  await loadGisScript()
  ensureInitialized(clientId)

  return new Promise<string>((resolve, reject) => {
    pendingCredential = { resolve, reject }

    window.google!.accounts.id.prompt((notification) => {
      if (notification.isDismissedMoment()) {
        const reason = notification.getDismissedReason()
        if (reason === 'credential_returned') return
        pendingCredential = null
        reject(new Error('Login com Google cancelado.'))
        return
      }

      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        pendingCredential = null
        const detail = notification.isNotDisplayed()
          ? notification.getNotDisplayedReason()
          : notification.getSkippedReason()
        reject(new Error(`Não foi possível abrir o login do Google (${detail}).`))
      }
    })
  })
}

export function isGoogleSignInConfigured() {
  return Boolean(googleClientId())
}
