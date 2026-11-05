import { z } from 'zod'

import { email, passwordSchema, user, username } from './auth'
import { network } from './common'
import { walletType } from './commerce'

export const profileResponse = z.object({ user })

const ensLabel = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{3,32}$/, 'Use de 3 a 32 letras, números ou hífen.')

export const updateProfileInput = z.object({
  displayName: z.string().trim().min(1, 'Informe o nome de exibição.').max(40, 'Use no máximo 40 caracteres.'),
  username,
  email,
  /** Só o rótulo; o sufixo `.eth` é fixo. */
  ensName: ensLabel,
  walletNickname: z.string().trim().min(1, 'Informe o apelido da carteira.').max(32, 'Use no máximo 32 caracteres.'),
})
export type UpdateProfileInput = z.infer<typeof updateProfileInput>

export const AVATAR_MAX_BYTES = 512 * 1024

export const updateAvatarInput = z.object({
  /** Imagem como data URL (png, jpeg ou webp). */
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, 'Envie uma imagem PNG, JPEG ou WebP.'),
})

export const changePasswordInput = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha precisa ser diferente da atual.',
  })
export type ChangePasswordInput = z.infer<typeof changePasswordInput>

export const walletSlot = z.enum(['primary', 'secondary'])
export type WalletSlot = z.infer<typeof walletSlot>

export const evmAddress = z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, 'Digite um endereço 0x válido com 40 caracteres.')

export const walletInput = z.object({
  displayName: z.string().trim().min(1, 'Informe o nome de exibição.'),
  nickname: z.string().trim().min(1, 'Informe o apelido da carteira.').max(32, 'Use no máximo 32 caracteres.'),
  network,
  profileName: z.string().trim().min(1, 'Informe o nome do perfil.'),
  address: evmAddress,
  secondaryAddress: z.string().trim().max(64).optional(),
  type: walletType,
  referralCode: z.string().trim().min(1, 'Informe o código de indicação.'),
  email,
  ensName: ensLabel,
})
export type WalletInput = z.infer<typeof walletInput>

export const wallet = walletInput.extend({
  id: z.string(),
  slot: walletSlot,
  version: z.number().int().min(1),
})
export type Wallet = z.infer<typeof wallet>

export const walletsResponse = z.object({
  primary: wallet.nullable(),
  secondary: wallet.nullable(),
})
export type WalletsResponse = z.infer<typeof walletsResponse>
