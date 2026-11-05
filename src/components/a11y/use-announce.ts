import { createContext, useContext } from 'react'

export type Politeness = 'polite' | 'assertive'

export type Announce = (message: string, politeness?: Politeness) => void

export const AnnouncerContext = createContext<Announce | null>(null)

export function useAnnounce() {
  const announce = useContext(AnnouncerContext)
  if (!announce) throw new Error('useAnnounce precisa estar dentro de <AnnouncerProvider>')
  return announce
}
