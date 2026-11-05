import { http } from '@/lib/http'

import {
  profileResponse,
  wallet,
  walletsResponse,
  type ChangePasswordInput,
  type UpdateProfileInput,
  type WalletInput,
  type WalletSlot,
} from './contracts'

export const accountApi = {
  async profile(signal?: AbortSignal) {
    const { data } = await http.get('/me/profile', { signal })
    return profileResponse.parse(data).user
  },

  async updateProfile(input: UpdateProfileInput) {
    const { data } = await http.patch('/me/profile', input)
    return profileResponse.parse(data).user
  },

  async updateAvatar(dataUrl: string) {
    const { data } = await http.put('/me/avatar', { dataUrl })
    return profileResponse.parse(data).user
  },

  async removeAvatar() {
    const { data } = await http.delete('/me/avatar')
    return profileResponse.parse(data).user
  },

  async changePassword(input: ChangePasswordInput) {
    await http.post('/me/password', input)
  },

  async wallets(signal?: AbortSignal) {
    const { data } = await http.get('/me/wallets', { signal })
    return walletsResponse.parse(data)
  },

  async saveWallet(slot: WalletSlot, input: WalletInput) {
    const { data } = await http.put(`/me/wallets/${slot}`, input)
    return wallet.parse(data)
  },
}
