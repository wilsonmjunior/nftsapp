import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { catalogApi } from '@/api/catalog'
import type { NftListQuery } from '@/api/contracts'

export const catalogKeys = {
  all: ['catalog'] as const,
  list: (query: NftListQuery) => ['catalog', 'list', query] as const,
  detail: (nftId: string) => ['catalog', 'detail', nftId] as const,
  featured: ['catalog', 'featured'] as const,
}

export const nftListQueryOptions = (query: NftListQuery) =>
  queryOptions({
    queryKey: catalogKeys.list(query),
    // O signal cancela a busca anterior quando os filtros mudam: resposta obsoleta não sobrescreve a atual.
    queryFn: ({ signal }) => catalogApi.list(query, signal),
    placeholderData: keepPreviousData,
  })

export const featuredNftQueryOptions = () =>
  queryOptions({
    queryKey: catalogKeys.featured,
    queryFn: ({ signal }) => catalogApi.featured(signal),
  })

export const nftDetailQueryOptions = (nftId: string) =>
  queryOptions({
    queryKey: catalogKeys.detail(nftId),
    queryFn: ({ signal }) => catalogApi.detail(nftId, signal),
  })
