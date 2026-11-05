import { isAxiosError, isCancel } from 'axios'
import { ZodError } from 'zod'

import { apiErrorBody, type ApiErrorCode } from './contracts'

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'canceled' | 'contract'

type ApiErrorInit = {
  kind: ApiErrorKind
  message: string
  status?: number
  code?: ApiErrorCode
  fields?: Record<string, string>
  details?: unknown
  cause?: unknown
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  readonly code: ApiErrorCode | undefined
  readonly fields: Record<string, string>
  readonly details: unknown

  constructor({ kind, message, status, code, fields, details, cause }: ApiErrorInit) {
    super(message, { cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.code = code
    this.fields = fields ?? {}
    this.details = details
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isTransient() {
    if (this.kind === 'network' || this.kind === 'timeout') return true
    return this.status !== undefined && (this.status >= 500 || this.status === 429 || this.code === 'TRANSIENT')
  }
}

const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  http: 'Não foi possível concluir a operação.',
  network: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
  timeout: 'O servidor demorou para responder. Tente novamente.',
  canceled: 'A requisição foi cancelada.',
  contract: 'Recebemos uma resposta inesperada do servidor.',
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (error instanceof ZodError) {
    return new ApiError({ kind: 'contract', message: FALLBACK_MESSAGES.contract, details: error.issues, cause: error })
  }

  if (isCancel(error)) {
    return new ApiError({ kind: 'canceled', message: FALLBACK_MESSAGES.canceled, cause: error })
  }

  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ kind: 'timeout', message: FALLBACK_MESSAGES.timeout, cause: error })
    }

    if (!error.response) {
      return new ApiError({ kind: 'network', message: FALLBACK_MESSAGES.network, cause: error })
    }

    const parsed = apiErrorBody.safeParse(error.response.data)
    return new ApiError({
      kind: 'http',
      status: error.response.status,
      code: parsed.success ? parsed.data.error.code : undefined,
      message: parsed.success ? parsed.data.error.message : FALLBACK_MESSAGES.http,
      fields: parsed.success ? parsed.data.error.fields : undefined,
      details: parsed.success ? parsed.data.error.details : undefined,
      cause: error,
    })
  }

  return new ApiError({ kind: 'http', message: FALLBACK_MESSAGES.http, cause: error })
}
