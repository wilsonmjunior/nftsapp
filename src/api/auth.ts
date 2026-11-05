import { http } from '@/lib/http'

import { authResponse, sessionResponse, type LoginInput, type RegisterInput } from './contracts'

export const authApi = {
  async register(input: RegisterInput) {
    const { data } = await http.post('/auth/register', input)
    return authResponse.parse(data)
  },

  async login(input: LoginInput) {
    const { data } = await http.post('/auth/login', input)
    return authResponse.parse(data)
  },

  async session(signal?: AbortSignal) {
    const { data } = await http.get('/auth/session', { signal })
    return sessionResponse.parse(data).session
  },

  async logout() {
    await http.post('/auth/logout')
  },
}
