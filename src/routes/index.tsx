import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { CatalogQuickBar } from '@/features/catalog/components/catalog-quick-bar'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { CATALOG_DEFAULTS, catalogSearch } from '@/features/catalog/search'
import { HeroCarousel } from '@/features/home/hero-carousel'
import { MintJournal } from '@/features/home/mint-journal'
import { PromoBanners } from '@/features/home/promo-banners'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearch,
  search: { middlewares: [stripSearchParams(CATALOG_DEFAULTS)] },
  head: () => ({
    meta: [
      { title: 'Kurio — Marketplace de NFTs' },
      {
        name: 'description',
        content:
          'Explore o catálogo Kurio: filtre por coleção, rede e preço, favoritos e compra com carteira simulada.',
      },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  return (
    <>
      <CatalogQuickBar />
      <HeroCarousel />
      <CatalogSection />
      <PromoBanners />
      <MintJournal />
    </>
  )
}
