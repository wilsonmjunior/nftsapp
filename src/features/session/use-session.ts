import { useQuery } from '@tanstack/react-query'

import { sessionQueryOptions } from './session-query'

export type SessionStatus = 'pending' | 'authenticated' | 'anonymous'

export function useSession() {
  const query = useQuery(sessionQueryOptions())
  const session = query.data ?? null
  const status: SessionStatus = query.isPending ? 'pending' : session ? 'authenticated' : 'anonymous'

  return { session, user: session?.user ?? null, status }
}
