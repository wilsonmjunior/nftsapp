import { HttpResponse } from 'msw'

import { NFT_PAGE_SIZE, NETWORK_LABELS, nftListQuery, type NftListQuery } from '@/api/contracts'
import { eth } from '@/lib/eth'

import { collectionOf, defaultEdition, findNft, toDetail, toSummary } from '../db/domain'
import { db } from '../db/store'
import type { NftRecord } from '../db/types'
import { fail, notFound, route } from '../route'
import { scenario } from '../scenarios'

const NEW_WINDOW_MS = 14 * 24 * 3_600_000
const TRENDING_MIN_POPULARITY = 70

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parseQuery(url: URL): NftListQuery {
  const params = url.searchParams
  const number = (key: string) => (params.has(key) ? Number(params.get(key)) : undefined)
  const result = nftListQuery.safeParse({
    q: params.get('q') || undefined,
    collections: params.getAll('collections').filter(Boolean),
    networks: params.getAll('networks').filter(Boolean),
    minPrice: params.get('minPrice') || undefined,
    maxPrice: params.get('maxPrice') || undefined,
    tab: params.get('tab') || undefined,
    sort: params.get('sort') || undefined,
    page: number('page'),
    pageSize: number('pageSize'),
  })
  if (!result.success) {
    throw fail(422, 'VALIDATION_ERROR', 'Parâmetros de busca inválidos.', {
      fields: Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message])),
    })
  }
  return result.data
}

type Facet = 'collections' | 'networks' | 'price'

function filterNfts(nfts: readonly NftRecord[], query: NftListQuery, skip?: Facet) {
  const newestListing = Math.max(...nfts.map((nft) => Date.parse(nft.listedAt)))
  const q = query.q ? normalize(query.q) : null

  return nfts.filter((nft) => {
    if (q && !normalize(`${nft.name} ${nft.tokenId} ${collectionOf(nft).name}`).includes(q)) return false
    if (query.tab === 'new' && Date.parse(nft.listedAt) < newestListing - NEW_WINDOW_MS) return false
    if (query.tab === 'trending' && nft.popularity < TRENDING_MIN_POPULARITY) return false
    if (skip !== 'collections' && query.collections?.length && !query.collections.includes(nft.collectionId)) return false
    if (skip !== 'networks' && query.networks?.length && !query.networks.includes(nft.network)) return false
    if (skip !== 'price') {
      const price = eth(defaultEdition(nft).price)
      if (query.minPrice && price.lt(query.minPrice)) return false
      if (query.maxPrice && price.gt(query.maxPrice)) return false
    }
    return true
  })
}

function sortNfts(nfts: NftRecord[], sort: NftListQuery['sort'] = 'recent') {
  const byPrice = (a: NftRecord, b: NftRecord) => eth(defaultEdition(a).price).cmp(defaultEdition(b).price)
  const sorted = [...nfts]
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => byPrice(a, b) || a.id.localeCompare(b.id))
    case 'price-desc':
      return sorted.sort((a, b) => byPrice(b, a) || a.id.localeCompare(b.id))
    case 'popular':
      return sorted.sort((a, b) => b.popularity - a.popularity || a.id.localeCompare(b.id))
    default:
      return sorted.sort((a, b) => b.listedAt.localeCompare(a.listedAt) || a.id.localeCompare(b.id))
  }
}

export const catalogHandlers = [
  route('get', '/nfts/featured', 'nfts.featured', () => {
    const nft = db.state.nfts.find((item) => item.featured) ?? db.state.nfts[0]!
    return HttpResponse.json({ nft: toSummary(nft) })
  }),

  route('get', '/nfts', 'nfts.list', ({ request }) => {
    const query = parseQuery(new URL(request.url))
    const source = scenario.config.emptyCatalog ? [] : db.state.nfts
    const pageSize = query.pageSize ?? NFT_PAGE_SIZE
    const filtered = sortNfts(filterNfts(source, query), query.sort)
    const totalPages = Math.ceil(filtered.length / pageSize)
    const page = query.page ?? 1

    const count = <K extends string>(items: NftRecord[], key: (nft: NftRecord) => K) =>
      items.reduce((map, nft) => map.set(key(nft), (map.get(key(nft)) ?? 0) + 1), new Map<K, number>())
    const collectionCounts = count(filterNfts(source, query, 'collections'), (nft) => nft.collectionId)
    const networkCounts = count(filterNfts(source, query, 'networks'), (nft) => nft.network)
    const prices = db.state.nfts.map((nft) => eth(defaultEdition(nft).price))

    return HttpResponse.json({
      items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
      page,
      pageSize,
      total: filtered.length,
      totalPages,
      facets: {
        collections: db.state.collections.map((collection) => ({ ...collection, count: collectionCounts.get(collection.id) ?? 0 })),
        networks: (['ethereum', 'polygon', 'solana'] as const).map((id) => ({
          id,
          name: NETWORK_LABELS[id],
          count: networkCounts.get(id) ?? 0,
        })),
        priceRange: {
          min: prices.reduce((min, price) => (price.lt(min) ? price : min)).toFixed(),
          max: prices.reduce((max, price) => (price.gt(max) ? price : max)).toFixed(),
        },
      },
    })
  }),

  route<{ nftId: string }>('get', '/nfts/:nftId', 'nfts.detail', ({ params }) => {
    const nft = findNft(params.nftId)
    if (!nft) throw notFound('Este NFT não existe ou foi removido.')
    return HttpResponse.json(toDetail(nft))
  }),
]
