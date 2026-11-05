import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_SOCKET_URL: z.string().url(),
  VITE_ENABLE_MOCKS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  /** Cenário inicial dos mocks; `?scenario=` na URL tem prioridade. */
  VITE_MOCK_SCENARIO: z.string().optional(),
  VITE_MOCK_PANEL: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  /** Client ID Web do Google Identity Services. Sem valor, o botão Google fica indisponível. */
  VITE_GOOGLE_CLIENT_ID: z.string().optional(),
})

export const env = envSchema.parse(import.meta.env)

export function googleClientId() {
  return env.VITE_GOOGLE_CLIENT_ID?.trim() || ''
}
