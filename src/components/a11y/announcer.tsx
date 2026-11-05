import { useCallback, useRef, useState, type ReactNode } from 'react'

import { AnnouncerContext, type Announce, type Politeness } from './use-announce'

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Record<Politeness, string>>({ polite: '', assertive: '' })
  const timers = useRef<Partial<Record<Politeness, ReturnType<typeof setTimeout>>>>({})

  const announce = useCallback<Announce>((message, politeness = 'polite') => {
    clearTimeout(timers.current[politeness])
    // Limpar antes de escrever faz leitores de tela repetirem mensagens iguais.
    setMessages((current) => ({ ...current, [politeness]: '' }))
    timers.current[politeness] = setTimeout(() => {
      setMessages((current) => ({ ...current, [politeness]: message }))
    }, 50)
  }, [])

  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {messages.polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {messages.assertive}
      </div>
    </AnnouncerContext.Provider>
  )
}
