import { HttpResponse } from 'msw'

import {
  AVATAR_MAX_BYTES,
  changePasswordInput,
  updateAvatarInput,
  updateProfileInput,
  walletInput,
  walletSlot,
} from '@/api/contracts'

import { hashPassword, verifyPassword } from '../crypto'
import { db } from '../db/store'
import type { WalletRecord } from '../db/types'
import { fail, notFound, parseBody, requireUser, route } from '../route'
import { toUser } from './auth'

function updateUser(userId: string, patch: Partial<(typeof db.state.users)[number]>) {
  return db.mutate((state) => {
    const user = state.users.find((item) => item.id === userId)!
    Object.assign(user, patch)
    return user
  })
}

export const accountHandlers = [
  route('get', '/me/profile', 'profile.get', ({ request }) => {
    const { user } = requireUser(request)
    return HttpResponse.json({ user: toUser(user) })
  }),

  route('patch', '/me/profile', 'profile.update', async ({ request }) => {
    const { user } = requireUser(request)
    const input = await parseBody(request, updateProfileInput)

    const fields: Record<string, string> = {}
    const others = db.state.users.filter((item) => item.id !== user.id)
    if (others.some((item) => item.email === input.email)) fields.email = 'Este e-mail já está em uso.'
    if (others.some((item) => item.username.toLowerCase() === input.username.toLowerCase())) {
      fields.username = 'Este nome de usuário já está em uso.'
    }
    if (others.some((item) => item.ensName === input.ensName)) fields.ensName = 'Este nome ENS já pertence a outro colecionador.'
    if (Object.keys(fields).length > 0) throw fail(409, 'CONFLICT', 'Alguns dados já estão em uso.', { fields })

    return HttpResponse.json({ user: toUser(updateUser(user.id, input)) })
  }),

  route('put', '/me/avatar', 'profile.avatar', async ({ request }) => {
    const { user } = requireUser(request)
    const { dataUrl } = await parseBody(request, updateAvatarInput)
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    if ((base64.length * 3) / 4 > AVATAR_MAX_BYTES) {
      throw fail(413, 'PAYLOAD_TOO_LARGE', 'A imagem pode ter no máximo 512 KB.', { fields: { dataUrl: 'A imagem pode ter no máximo 512 KB.' } })
    }
    return HttpResponse.json({ user: toUser(updateUser(user.id, { avatarUrl: dataUrl })) })
  }),

  route('delete', '/me/avatar', 'profile.avatarRemove', ({ request }) => {
    const { user } = requireUser(request)
    return HttpResponse.json({ user: toUser(updateUser(user.id, { avatarUrl: null })) })
  }),

  route('post', '/me/password', 'profile.password', async ({ request }) => {
    const { user, session } = requireUser(request)
    const input = await parseBody(request, changePasswordInput)
    if (!user.passwordHash) {
      throw fail(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', {
        fields: { currentPassword: 'Esta conta usa login com Google e não possui senha.' },
      })
    }
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw fail(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', { fields: { currentPassword: 'A senha atual está incorreta.' } })
    }

    const passwordHash = await hashPassword(input.newPassword)
    db.mutate((state) => {
      state.users.find((item) => item.id === user.id)!.passwordHash = passwordHash
      for (const item of state.sessions) {
        if (item.userId === user.id && item.token !== session.token) item.revoked = true
      }
    })
    return new HttpResponse(null, { status: 204 })
  }),

  route('get', '/me/wallets', 'wallets.list', ({ request }) => {
    const { user } = requireUser(request)
    const wallets = db.state.wallets[user.id] ?? {}
    return HttpResponse.json({ primary: wallets.primary ?? null, secondary: wallets.secondary ?? null })
  }),

  route<{ slot: string }>('put', '/me/wallets/:slot', 'wallets.save', async ({ request, params }) => {
    const { user } = requireUser(request)
    const slot = walletSlot.safeParse(params.slot)
    if (!slot.success) throw notFound('Carteira não encontrada.')
    const input = await parseBody(request, walletInput)

    const other = db.state.wallets[user.id]?.[slot.data === 'primary' ? 'secondary' : 'primary']
    if (other && other.address.toLowerCase() === input.address.toLowerCase()) {
      throw fail(409, 'CONFLICT', 'Este endereço já está cadastrado na outra carteira.', {
        fields: { address: 'Este endereço já está cadastrado na outra carteira.' },
      })
    }

    const saved = db.mutate((state) => {
      const wallets = (state.wallets[user.id] ??= {})
      const current = wallets[slot.data]
      const record: WalletRecord = {
        ...input,
        id: current?.id ?? `wal_${user.id.replace('usr_', '')}_${slot.data}`,
        slot: slot.data,
        version: (current?.version ?? 0) + 1,
      }
      wallets[slot.data] = record
      return record
    })
    return HttpResponse.json(saved)
  }),
]
