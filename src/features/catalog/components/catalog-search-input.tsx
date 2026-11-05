import { cn } from 'cn'
import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const DEBOUNCE_MS = 350

type CatalogSearchInputProps = {
  id: string
  value: string | undefined
  onCommit: (value: string | undefined) => void
  className?: string
}

export function CatalogSearchInput({ id, value, onCommit, className }: CatalogSearchInputProps) {
  const [draft, setDraft] = useState(value ?? '')
  const [synced, setSynced] = useState(value)

  // A URL mudou por fora (voltar/avançar, limpar filtros): o campo acompanha.
  if (value !== synced) {
    setSynced(value)
    setDraft(value ?? '')
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = draft.trim() || undefined
      if (next !== value) onCommit(next)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, value, onCommit])

  return (
    <form
      role="search"
      aria-label="Buscar NFTs"
      onSubmit={(event) => {
        event.preventDefault()
        const next = draft.trim() || undefined
        if (next !== value) onCommit(next)
      }}
      className={cn('relative', className)}
    >
      <label htmlFor={id} className="sr-only">
        Buscar por nome, token ou coleção
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id={id}
        data-catalog-search=""
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Explorar coleções"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={80}
        className="h-12 w-full rounded-xl bg-surface pr-11 pl-12 text-[15px] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-10 md:rounded-md md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft('')
            onCommit(undefined)
          }}
          aria-label="Limpar busca"
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </form>
  )
}
