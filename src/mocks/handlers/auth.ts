import { HttpResponse } from 'msw'

import { googleAuthInput, loginInput, registerInput, type AuthResponse, type User } from '@/api/contracts'

import { hashPassword, randomToken, verifyPassword } from '../crypto'
import { db } from '../db/store'
import type { UserRecord } from '../db/types'
import { type GoogleClaims, verifyGoogleIdToken } from '../google-identity'
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

function startSession(user: UserRecord): AuthResponse {
  const token = randomToken('tok')
  const expiresAt = new Date(Date.now() + sessionTtlMs()).toISOString()
  db.mutate((state) => {
    state.sessions.push({ token, userId: user.id, expiresAt, revoked: false })
  })
  return { token, session: { user: toUser(user), expiresAt } }
}

function uniqueUsername(base: string) {
  const sanitized = base
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, 24)
  const root = sanitized.length >= 3 ? sanitized : `user${sanitized}`.slice(0, 24).padEnd(3, '0')

  const taken = (candidate: string) =>
    db.state.users.some((user) => user.username.toLowerCase() === candidate.toLowerCase())

  if (!taken(root)) return root
  for (let index = 2; index < 10_000; index += 1) {
    const suffix = String(index)
    const candidate = `${root.slice(0, Math.max(3, 24 - suffix.length))}${suffix}`
    if (!taken(candidate)) return candidate
  }
  return `user${Date.now().toString(36)}`.slice(0, 24)
}

export function establishGoogleSession(claims: GoogleClaims): AuthResponse {
  const bySub = db.state.users.find((user) => user.googleSub === claims.sub)
  if (bySub) {
    const updated = db.mutate((state) => {
      const user = state.users.find((item) => item.id === bySub.id)!
      if (!user.avatarUrl && claims.picture) user.avatarUrl = claims.picture
      if (claims.name && user.displayName === user.username) user.displayName = claims.name
      return user
    })
    return startSession(updated)
  }

  const byEmail = db.state.users.find((user) => user.email === claims.email)
  if (byEmail) {
    const updated = db.mutate((state) => {
      const user = state.users.find((item) => item.id === byEmail.id)!
      user.googleSub = claims.sub
      if (!user.avatarUrl && claims.picture) user.avatarUrl = claims.picture
      return user
    })
    return startSession(updated)
  }

  const localPart = claims.email.split('@')[0] ?? 'colecionador'
  const username = uniqueUsername(localPart)
  const displayName = claims.name || username
  const createdAt = new Date().toISOString()

  const user = db.mutate((state) => {
    const record: UserRecord = {
      id: db.nextId('usr'),
      username,
      displayName,
      email: claims.email,
      passwordHash: null,
      googleSub: claims.sub,
      avatarUrl: claims.picture,
      ensName: null,
      walletNickname: null,
      createdAt,
    }
    state.users.push(record)
    state.favorites[record.id] = []
    state.carts[record.id] = { items: [], version: 0, updatedAt: createdAt }
    state.wallets[record.id] = {}
    return record
  })

  return startSession(user)
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
        googleSub: null,
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
    if (user && !user.passwordHash) {
      throw fail(401, 'UNAUTHORIZED', 'Esta conta usa login com Google. Continue com Google.')
    }
    const valid = user ? await verifyPassword(input.password, user.passwordHash) : false
    if (!user || !valid) throw fail(401, 'UNAUTHORIZED', 'E-mail ou senha incorretos.')

    return HttpResponse.json(startSession(user))
  }),

  route('post', '/auth/google', 'auth.google', async ({ request }) => {
    const input = await parseBody(request, googleAuthInput)
    const claims = await verifyGoogleIdToken(input.idToken)
    return HttpResponse.json(establishGoogleSession(claims))
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
      // Token inválido ou expirado: logout responde 204 do mesmo jeito.
    }
    if (auth) {
      const { token } = auth.session
      db.mutate((state) => {
        const session = state.sessions.find((item) => item.token === token)
        if (session) session.revoked = true
      })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
