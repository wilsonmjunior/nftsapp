import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

import { toApiError } from '@/api/errors'
import { nftDetailQueryOptions } from '@/features/catalog/queries'
import { NftDetailSkeleton, NftDetailView } from '@/features/nft-detail/nft-detail-view'

const detailSearch = z.object({
  edition: z.string().trim().min(1).optional().catch(undefined),
})

export const Route = createFileRoute('/nfts/$nftId')({
  validateSearch: detailSearch,
  search: { middlewares: [stripSearchParams({})] },
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(nftDetailQueryOptions(params.nftId))
    } catch {
      return null
    }
  },
  head: ({ loaderData, params }) => {
    const nft = loaderData
    if (!nft) {
      return {
        meta: [
          { title: `NFT ${params.nftId} — Kurio` },
          { name: 'description', content: 'Detalhes, edições e compra de NFT no marketplace Kurio.' },
        ],
      }
    }
    const raw = nft.description.trim()
    const description = raw.length > 155 ? `${raw.slice(0, 155)}…` : raw
    return {
      meta: [
        { title: `${nft.name} — Kurio` },
        { name: 'description', content: description },
      ],
    }
  },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { edition } = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = useQuery(nftDetailQueryOptions(nftId))

  if (query.isError) {
    const error = toApiError(query.error)
    if (error.status === 404) {
      return (
        <div className="page-container flex min-h-[50svh] flex-col items-center justify-center gap-4 py-16 text-center">
          <h1 className="text-2xl font-bold">NFT não encontrado</h1>
          <p className="max-w-md text-muted-foreground">
            Este colecionável não existe, foi removido ou o endereço está incorreto.
          </p>
          <Link to="/" hash="catalogo" className="text-brand-strong underline underline-offset-4">
            Voltar ao mercado
          </Link>
        </div>
      )
    }

    return (
      <div className="page-container flex min-h-[40svh] flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Não foi possível carregar este NFT</h1>
        <p className="max-w-md text-muted-foreground">{error.message}</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!query.data) return <NftDetailSkeleton />

  return (
    <NftDetailView
      nft={query.data}
      editionId={edition}
      onEditionChange={(next) =>
        void navigate({
          search: (prev) => ({ ...prev, edition: next }),
          replace: true,
        })
      }
    />
  )
}
