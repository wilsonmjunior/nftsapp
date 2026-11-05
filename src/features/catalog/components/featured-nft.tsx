import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { NftImage } from '@/components/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'

import { featuredNftQueryOptions } from '../queries'

export function FeaturedNft() {
  const { data: nft } = useQuery(featuredNftQueryOptions())

  return (
    <section aria-labelledby="destaque-title" className="relative overflow-hidden rounded-md bg-band/60">
      <div className="px-4 pt-5 pb-3 text-center">
        <h2 id="destaque-title" className="text-left text-xl font-bold text-brand-strong">
          NFT EM DESTAQUE
        </h2>
        <p className="mt-1 text-lg font-bold">OFERTA LIMITADA</p>
      </div>
      {nft ? (
        <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="group block focus-visible:outline-none">
          <div className="overflow-hidden rounded-[14px] group-focus-visible:ring-2 group-focus-visible:ring-ring">
            <NftImage src={nft.image} alt="" sizes="310px" className="transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
          </div>
          <p className="flex items-baseline justify-between px-4 py-3 text-sm">
            <span>{nft.name}</span>
            <span className="font-bold text-brand">{formatEth(nft.price)}</span>
          </p>
        </Link>
      ) : (
        <>
          <Skeleton className="aspect-square w-full rounded-[14px]" />
          <div className="px-4 py-3">
            <Skeleton className="h-5" />
          </div>
        </>
      )}
    </section>
  )
}
