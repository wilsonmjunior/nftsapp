import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useCallback } from 'react'

import type { CatalogPatch } from './components/catalog-filters'
import { nftListQueryOptions } from './queries'
import { toListQuery } from './search'

const homeRoute = getRouteApi('/')

export const CLEARED_FILTERS: CatalogPatch = {
  q: undefined,
  collection: undefined,
  network: undefined,
  minPrice: undefined,
  maxPrice: undefined,
}

export function useCatalogState() {
  const search = homeRoute.useSearch()
  const navigate = homeRoute.useNavigate()
  const query = useQuery(nftListQueryOptions(toListQuery(search)))

  const update = useCallback(
    (patch: CatalogPatch) => navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), resetScroll: false }),
    [navigate],
  )
  const clear = useCallback(() => update(CLEARED_FILTERS), [update])
  const commitQuery = useCallback((q: string | undefined) => update({ q }), [update])

  return { search, query, update, clear, commitQuery }
}
