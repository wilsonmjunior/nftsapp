import { z } from 'zod'

import { ethAmount, isoDate, network, paginated } from './common'

export const collection = z.object({
  id: z.string(),
  name: z.string(),
})
export type Collection = z.infer<typeof collection>

export const editionKind = z.enum(['1/1', '1/10', '1/50', 'open'])
export type EditionKind = z.infer<typeof editionKind>

export const edition = z.object({
  id: z.string(),
  kind: editionKind,
  label: z.string(),
  /** `null` para edição aberta (sem limite de tiragem). */
  supply: z.number().int().positive().nullable(),
  available: z.number().int().min(0),
  /** Limite por compra; já considera a disponibilidade. */
  maxPerOrder: z.number().int().min(0),
  price: ethAmount,
})
export type Edition = z.infer<typeof edition>

export const nftSummary = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  collection,
  network,
  price: ethAmount,
  originalPrice: ethAmount.nullable(),
  rare: z.boolean(),
  soldOut: z.boolean(),
  defaultEditionId: z.string(),
  listedAt: isoDate,
  version: z.number().int().min(1),
})
export type NftSummary = z.infer<typeof nftSummary>

export const collectorReview = z.object({
  id: z.string(),
  author: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
  createdAt: isoDate,
})
export type CollectorReview = z.infer<typeof collectorReview>

export const nftDetail = nftSummary.extend({
  description: z.string(),
  details: z.array(z.string()),
  attributes: z.array(z.string()),
  contractAddress: z.string(),
  royaltiesPercent: z.number(),
  rating: z.object({ average: z.number(), count: z.number().int() }),
  reviews: z.array(collectorReview),
  editions: z.array(edition),
  gallery: z.array(z.string()),
})
export type NftDetail = z.infer<typeof nftDetail>

export const nftTab = z.enum(['all', 'new', 'trending'])
export type NftTab = z.infer<typeof nftTab>

export const nftSort = z.enum(['recent', 'price-asc', 'price-desc', 'popular'])
export type NftSort = z.infer<typeof nftSort>

export const NFT_PAGE_SIZE = 9

export const nftListQuery = z.object({
  q: z.string().trim().max(80).optional(),
  collections: z.array(z.string()).optional(),
  networks: z.array(network).optional(),
  minPrice: ethAmount.optional(),
  maxPrice: ethAmount.optional(),
  tab: nftTab.optional(),
  sort: nftSort.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
})
export type NftListQuery = z.infer<typeof nftListQuery>

export const facetCount = z.object({ id: z.string(), name: z.string(), count: z.number().int() })

export const nftListResponse = paginated(nftSummary).extend({
  facets: z.object({
    collections: z.array(facetCount),
    networks: z.array(facetCount),
    priceRange: z.object({ min: ethAmount, max: ethAmount }),
  }),
})
export type NftListResponse = z.infer<typeof nftListResponse>

export const featuredNftResponse = z.object({ nft: nftSummary })
