import { z } from 'zod'

import { isoDate } from './common'

export const user = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  ensName: z.string().nullable(),
  walletNickname: z.string().nullable(),
})
export type User = z.infer<typeof user>

export const session = z.object({
  user,
  expiresAt: isoDate,
})
export type Session = z.infer<typeof session>

export const authResponse = z.object({
  session,
  token: z.string(),
})
export type AuthResponse = z.infer<typeof authResponse>

export const sessionResponse = z.object({ session })

const password = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .max(72, 'A senha pode ter no máximo 72 caracteres.')
  .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra.')
  .regex(/\d/, 'Inclua pelo menos um número.')

export const username = z
  .string()
  .trim()
  .min(3, 'O nome de usuário precisa ter pelo menos 3 caracteres.')
  .max(24, 'O nome de usuário pode ter no máximo 24 caracteres.')
  .regex(/^[a-z0-9._]+$/i, 'Use apenas letras, números, ponto ou sublinhado.')

export const email = z.email('Digite um e-mail válido.').trim().toLowerCase()

export const registerInput = z
  .object({
    username,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
export type RegisterInput = z.infer<typeof registerInput>

export const loginInput = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
})
export type LoginInput = z.infer<typeof loginInput>

export const googleAuthInput = z.object({
  idToken: z.string().min(1, 'Token do Google ausente.'),
})
export type GoogleAuthInput = z.infer<typeof googleAuthInput>

export const passwordSchema = password
