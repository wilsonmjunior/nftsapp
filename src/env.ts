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
})

export const env = envSchema.parse(import.meta.env)
