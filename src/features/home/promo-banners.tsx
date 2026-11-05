import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { NftImage } from '@/components/nft-image'

type Banner = {
  title: string
  description: string
  image: string
  link: Pick<LinkProps, 'to' | 'search' | 'hash'>
}

const BANNERS: Banner[] = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: 'emerald',
    link: { to: '/', search: { tab: 'new' }, hash: 'catalogo' },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    description: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura da rede.',
    image: 'baron',
    link: { to: '/', search: { collection: ['arte-digital'] }, hash: 'catalogo' },
  },
]

export function PromoBanners() {
  return (
    <section aria-label="Coleções em destaque" className="page-container mt-24 grid gap-6 md:grid-cols-2 md:gap-8">
      {BANNERS.map((banner) => (
        <article key={banner.title} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] overflow-hidden rounded-xl bg-surface">
          <NftImage src={banner.image} alt="" sizes="(min-width: 768px) 290px, 45vw" className="h-full rounded-xl" />
          <div className="flex flex-col items-end justify-center gap-3 p-4 text-right lg:p-5">
            <h2 className="text-sm leading-snug font-bold lg:text-[17px]">{banner.title}</h2>
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground lg:text-[13px]">{banner.description}</p>
            <Link
              {...banner.link}
              aria-label={`Explorar: ${banner.title}`}
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-strong"
            >
              Explorar
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}
