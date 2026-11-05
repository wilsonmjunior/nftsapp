import { cn } from 'cn'

import type { Edition } from '@/api/contracts'

type EditionChipsProps = {
  editions: Edition[]
  value: string
  onChange: (editionId: string) => void
}

export function EditionChips({ editions, value, onChange }: EditionChipsProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold">Edição:</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Edição">
        {editions.map((edition) => {
          const soldOut = edition.available === 0 || edition.maxPerOrder === 0
          const selected = edition.id === value
          const label = edition.kind === 'open' ? 'ABERTA' : edition.label

          return (
            <button
              key={edition.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={soldOut || undefined}
              aria-label={soldOut ? `${label}, esgotada` : label}
              disabled={soldOut}
              title={soldOut ? `${label}: esgotada` : `${label}: ${edition.available} disponíveis`}
              onClick={() => onChange(edition.id)}
              className={cn(
                'min-w-16 rounded-full border px-4 py-1.5 text-sm font-bold uppercase transition-colors',
                soldOut && 'cursor-not-allowed opacity-40',
                selected && !soldOut
                  ? 'border-brand bg-brand/15 text-brand-strong'
                  : 'border-border text-muted-foreground hover:border-brand/60 hover:text-brand-strong',
              )}
            >
              <span aria-hidden="true">{label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
