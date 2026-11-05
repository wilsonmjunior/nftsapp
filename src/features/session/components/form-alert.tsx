import { cn } from 'cn'
import { CircleAlert, Info } from 'lucide-react'
import type { ReactNode } from 'react'

export function FormAlert({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  const Icon = tone === 'error' ? CircleAlert : Info

  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
        tone === 'error' ? 'border-required/50 text-required' : 'border-brand/50 text-muted-foreground',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
