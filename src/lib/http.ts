import axios from 'axios'

import { toApiError } from '@/api/errors'
import { env } from '@/env'
import { sessionToken } from '@/lib/session-token'
import { mocksReady } from '@/mocks/ready'

export const HTTP_TIMEOUT_MS = 10_000

export const http = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: HTTP_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
  paramsSerializer: { indexes: null },
})

type UnauthorizedListener = (info: { code: string | undefined; url: string | undefined; token: string }) => void

/** 401 nesses endpoints é resposta esperada (credencial errada, sessão já encerrada), não expiração. */
const SESSION_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/logout']

const unauthorizedListeners = new Set<UnauthorizedListener>()

/** Avisado quando uma requisição autenticada recebe 401 (sessão expirada ou revogada). */
export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

http.interceptors.request.use(async (config) => {
  // Com mocks, aguarda o worker MSW antes de qualquer REST (UI já pode ter pintado o hero).
  await mocksReady
  const token = sessionToken.get()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    const config = axios.isAxiosError(error) ? error.config : undefined
    const authorization = config?.headers?.Authorization
    const token = typeof authorization === 'string' ? authorization.replace(/^Bearer /, '') : null

    if (apiError.isUnauthorized && token && !SESSION_ENDPOINTS.includes(config?.url ?? '')) {
      unauthorizedListeners.forEach((listener) => listener({ code: apiError.code, url: config?.url, token }))
    }

    return Promise.reject(apiError)
  },
)
