import { delay, http, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import type { z } from 'zod'

import type { ApiErrorCode } from '@/api/contracts'
import { env } from '@/env'

import { db } from './db/store'
import { scenario } from './scenarios'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

/** Handler com latência e falhas do cenário ativo. Respostas lançadas (`throw fail(...)`) encerram o fluxo. */
export function route<Params extends PathParams>(
  method: Method,
  path: string,
  endpoint: string,
  resolver: HttpResponseResolver<Params, DefaultBodyType>,
) {
  return http[method]<Params>(`${env.VITE_API_URL}${path}`, async (info) => {
    const context = scenario.nextContext(endpoint)
    await delay(scenario.config.latency(context))

    const intercepted = scenario.takeInjectedFailure(endpoint) ?? scenario.config.intercept?.(context)
    if (intercepted) return intercepted

    try {
      return await resolver(info)
    } catch (error) {
      if (error instanceof Response) return error
      console.error(`[mock] ${endpoint}`, error)
      return fail(500, 'INTERNAL', 'Erro inesperado na simulação.')
    }
  })
}

export function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: { fields?: Record<string, string>; details?: unknown } = {},
) {
  return HttpResponse.json({ error: { code, message, ...extra } }, { status })
}

export function notFound(message = 'Recurso não encontrado.') {
  return fail(404, 'NOT_FOUND', message)
}

export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw fail(400, 'VALIDATION_ERROR', 'O corpo da requisição precisa ser JSON.')
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_'
      fields[key] ??= issue.message
    }
    throw fail(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', { fields })
  }
  return parsed.data
}

export function sessionTtlMs() {
  return scenario.config.sessionTtlMs ?? 2 * 60 * 60_000
}

/** Sessão do header Authorization, ou `null` para visitantes. Lança 401 para token inválido ou expirado. */
export function optionalUser(request: Request) {
  const header = request.headers.get('Authorization')
  if (!header) return null

  const token = header.replace(/^Bearer\s+/i, '')
  const session = db.state.sessions.find((item) => item.token === token)
  if (!session || session.revoked) throw fail(401, 'UNAUTHORIZED', 'Sua sessão não é mais válida. Entre novamente.')
  if (Date.parse(session.expiresAt) <= Date.now()) {
    throw fail(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }

  const user = db.state.users.find((item) => item.id === session.userId)
  if (!user) throw fail(401, 'UNAUTHORIZED', 'Sua sessão não é mais válida. Entre novamente.')
  return { user, session }
}

export function requireUser(request: Request) {
  const auth = optionalUser(request)
  if (!auth) throw fail(401, 'UNAUTHORIZED', 'Entre na sua conta para continuar.')
  return auth
}
