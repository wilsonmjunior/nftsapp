import { http } from '@/lib/http'

import { featuredNftResponse, nftDetail, nftListResponse, type NftListQuery } from './contracts'

export const catalogApi = {
  async list(query: NftListQuery, signal?: AbortSignal) {
    const { data } = await http.get('/nfts', { params: query, signal })
    return nftListResponse.parse(data)
  },

  async detail(nftId: string, signal?: AbortSignal) {
    const { data } = await http.get(`/nfts/${encodeURIComponent(nftId)}`, { signal })
    return nftDetail.parse(data)
  },

  async featured(signal?: AbortSignal) {
    const { data } = await http.get('/nfts/featured', { signal })
    return featuredNftResponse.parse(data).nft
  },
}
