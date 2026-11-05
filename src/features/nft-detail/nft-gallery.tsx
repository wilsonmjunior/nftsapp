import { Search } from 'lucide-react'
import { useState } from 'react'

import { NftImage } from '@/components/nft-image'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from 'cn'

type NftGalleryProps = {
  images: string[]
  alt: string
  rare?: boolean
  soldOut?: boolean
}

export function NftGallery({ images, alt, rare, soldOut }: NftGalleryProps) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const current = images[active] ?? images[0]!

  return (
    <div className="grid gap-3 md:grid-cols-[72px_1fr] md:gap-4">
      <ul className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col md:overflow-visible" aria-label="Miniaturas">
        {images.map((image, index) => (
          <li key={`${image}-${index}`} className="shrink-0">
            <button
              type="button"
              aria-label={`Mostrar imagem ${index + 1} de ${images.length}`}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => setActive(index)}
              className={cn(
                'overflow-hidden rounded-lg border-2 transition-colors',
                index === active ? 'border-brand' : 'border-transparent hover:border-border',
              )}
            >
              <NftImage src={image} alt="" sizes="72px" className="size-[72px]" />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative order-1 overflow-hidden rounded-2xl bg-surface md:order-2 md:rounded-[20px]">
        <NftImage src={current} alt={alt} sizes="(min-width: 1024px) 520px, 100vw" priority className="w-full" />
        {(rare || soldOut) && (
          <p className="absolute top-4 left-0 flex flex-col items-start gap-1">
            {rare && <span className="bg-brand px-3 py-1 text-xs font-bold text-primary-foreground">RARO</span>}
            {soldOut && <span className="bg-foreground px-3 py-1 text-xs font-bold text-background">ESGOTADO</span>}
          </p>
        )}
        <button
          type="button"
          aria-label="Ampliar imagem"
          onClick={() => setZoomed(true)}
          className="absolute top-3 right-3 grid size-10 place-items-center rounded-full border border-border bg-surface/90 text-foreground backdrop-blur-sm transition-colors hover:text-brand-strong"
        >
          <Search className="size-5" aria-hidden="true" />
        </button>
      </div>

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="max-w-[min(100vw-2rem,720px)] border-border bg-surface p-3 sm:p-4">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <NftImage src={current} alt={alt} sizes="720px" className="w-full rounded-xl" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
