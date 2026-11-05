import { Mail } from 'lucide-react'
import { toast } from 'sonner'

import { LinkedinIcon, XTwitterIcon } from '@/components/brand-icons'

type ShareNftProps = {
  name: string
  url: string
}

export function ShareNft({ name, url }: ShareNftProps) {
  const text = `Confira ${name} na Kurio`

  function open(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado.')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-muted-foreground">Compartilhar este NFT:</p>
      <ul className="flex items-center gap-2">
        <li>
          <button
            type="button"
            aria-label="Compartilhar no LinkedIn"
            onClick={() => open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)}
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-brand-strong"
          >
            <LinkedinIcon className="size-4" />
          </button>
        </li>
        <li>
          <button
            type="button"
            aria-label="Compartilhar por e-mail"
            onClick={() => open(`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n${url}`)}`)}
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-brand-strong"
          >
            <Mail className="size-4" aria-hidden="true" />
          </button>
        </li>
        <li>
          <button
            type="button"
            aria-label="Compartilhar no X"
            onClick={() =>
              open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
            }
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-brand-strong"
          >
            <XTwitterIcon className="size-4" />
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-brand-strong"
          >
            Copiar link
          </button>
        </li>
      </ul>
    </div>
  )
}
