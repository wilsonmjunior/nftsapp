import { z } from 'zod'

import { ethAmount, network, nftSort, nftTab, type NftListQuery } from '@/api/contracts'

const list = <T extends z.ZodType>(item: T) =>
  z
    .array(item)
    .optional()
    .catch(undefined)
    .transform((value) => (value?.length ? [...new Set(value)].sort() : undefined))

/** Valores inválidos caem no padrão em vez de quebrar a página. */
export const catalogSearch = z.object({
  q: z.string().trim().max(80).optional().catch(undefined).transform((value) => value || undefined),
  collection: list(z.string()),
  network: list(network),
  minPrice: ethAmount.optional().catch(undefined),
  maxPrice: ethAmount.optional().catch(undefined),
  tab: nftTab.default('all').catch('all'),
  sort: nftSort.default('recent').catch('recent'),
  page: z.coerce.number().int().min(1).default(1).catch(1),
})
export type CatalogSearch = z.infer<typeof catalogSearch>

/** Âncora da busca: a lupa do header leva a `/#busca`, que foca o campo. */
export const SEARCH_INPUT_ID = 'busca'

export const CATALOG_DEFAULTS = { tab: 'all', sort: 'recent', page: 1 } as const

export function toListQuery(search: CatalogSearch): NftListQuery {
  return {
    q: search.q,
    collections: search.collection,
    networks: search.network,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    tab: search.tab === 'all' ? undefined : search.tab,
    sort: search.sort,
    page: search.page,
  }
}

export function hasActiveFilters(search: CatalogSearch) {
  return Boolean(search.q || search.collection || search.network || search.minPrice || search.maxPrice)
}

export const TAB_LABELS: Record<CatalogSearch['tab'], string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const SORT_LABELS: Record<CatalogSearch['sort'], string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  popular: 'Mais populares',
}
