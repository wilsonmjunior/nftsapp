import { cn } from 'cn'

const NFT_IMAGE_WIDTHS = [320, 640, 960] as const

type NftImageProps = {
  /** Nome-base gerado por `npm run images` em `public/nfts`. */
  src: string
  alt: string
  sizes: string
  priority?: boolean
  className?: string
}

function srcSet(src: string, format: 'avif' | 'webp') {
  return NFT_IMAGE_WIDTHS.map((width) => `/nfts/${src}-${width}.${format} ${width}w`).join(', ')
}

export function NftImage({ src, alt, sizes, priority = false, className }: NftImageProps) {
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(src, 'avif')} sizes={sizes} />
      <img
        src={`/nfts/${src}-640.webp`}
        srcSet={srcSet(src, 'webp')}
        sizes={sizes}
        alt={alt}
        width={640}
        height={640}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={cn('aspect-square size-full object-cover', className)}
      />
    </picture>
  )
}
