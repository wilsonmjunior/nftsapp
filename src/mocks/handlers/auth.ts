import { HttpResponse } from 'msw'

import { loginInput, registerInput, type User } from '@/api/contracts'

import { hashPassword, randomToken, verifyPassword } from '../crypto'
import { db } from '../db/store'
import type { UserRecord } from '../db/types'
import { fail, optionalUser, parseBody, requireUser, route, sessionTtlMs } from '../route'

export function toUser(record: UserRecord): User {
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    email: record.email,
    avatarUrl: record.avatarUrl,
    ensName: record.ensName,
    walletNickname: record.walletNickname,
  }
}

function startSession(user: UserRecord) {
  const token = randomToken('tok')
  const expiresAt = new Date(Date.now() + sessionTtlMs()).toISOString()
  db.mutate((state) => {
    state.sessions.push({ token, userId: user.id, expiresAt, revoked: false })
  })
  return { token, session: { user: toUser(user), expiresAt } }
}

export const authHandlers = [
  route('post', '/auth/register', 'auth.register', async ({ request }) => {
    const input = await parseBody(request, registerInput)
    const fields: Record<string, string> = {}
    if (db.state.users.some((user) => user.email === input.email)) fields.email = 'Este e-mail já está cadastrado.'
    if (db.state.users.some((user) => user.username.toLowerCase() === input.username.toLowerCase())) {
      fields.username = 'Este nome de usuário já está em uso.'
    }
    if (Object.keys(fields).length > 0) throw fail(409, 'CONFLICT', 'Já existe uma conta com esses dados.', { fields })

    const passwordHash = await hashPassword(input.password)
    const user = db.mutate((state) => {
      const record: UserRecord = {
        id: db.nextId('usr'),
        username: input.username,
        displayName: input.username,
        email: input.email,
        passwordHash,
        avatarUrl: null,
        ensName: null,
        walletNickname: null,
        createdAt: new Date().toISOString(),
      }
      state.users.push(record)
      state.favorites[record.id] = []
      state.carts[record.id] = { items: [], version: 0, updatedAt: record.createdAt }
      state.wallets[record.id] = {}
      return record
    })

    return HttpResponse.json(startSession(user), { status: 201 })
  }),

  route('post', '/auth/login', 'auth.login', async ({ request }) => {
    const input = await parseBody(request, loginInput)
    const user = db.state.users.find((item) => item.email === input.email)
    const valid = user ? await verifyPassword(input.password, user.passwordHash) : false
    if (!user || !valid) throw fail(401, 'UNAUTHORIZED', 'E-mail ou senha incorretos.')

    return HttpResponse.json(startSession(user))
  }),

  route('get', '/auth/session', 'auth.session', ({ request }) => {
    const { user, session } = requireUser(request)
    return HttpResponse.json({ session: { user: toUser(user), expiresAt: session.expiresAt } })
  }),

  route('post', '/auth/logout', 'auth.logout', ({ request }) => {
    let auth: ReturnType<typeof optionalUser> = null
    try {
      auth = optionalUser(request)
    } catch {
      // Logout com sessão já expirada também conclui.
    }
    if (auth) {
      db.mutate((state) => {
        const session = state.sessions.find((item) => item.token === auth.session.token)
        if (session) session.revoked = true
      })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
