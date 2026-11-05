import { NftImage } from '@/components/nft-image'
import { UnavailableAction } from '@/components/unavailable-action'

const ARTICLES = [
  {
    date: '12 de setembro',
    dateTime: '2026-09-12',
    reading: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    summary: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: 'baron',
  },
  {
    date: '13 de setembro',
    dateTime: '2026-09-13',
    reading: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    summary: 'Conheça criadores que moldam a cultura digital.',
    image: 'emerald',
  },
  {
    date: '15 de setembro',
    dateTime: '2026-09-15',
    reading: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    summary: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: 'nomad',
  },
  {
    date: '15 de setembro',
    dateTime: '2026-09-15',
    reading: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    summary: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: 'golden',
  },
]

export function MintJournal() {
  return (
    <section aria-labelledby="diario-title" className="page-container mt-24">
      <h2 id="diario-title" className="text-center text-2xl font-bold md:text-[28px]">
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {ARTICLES.map((article) => (
          <li key={article.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-md bg-surface">
              <NftImage src={article.image} alt="" sizes="(min-width: 1024px) 270px, (min-width: 640px) 45vw, 100vw" className="aspect-[4/3]" />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-xs text-muted-foreground">
                  <time dateTime={article.dateTime}>{article.date}</time>
                  <span aria-hidden="true"> | </span>
                  <span className="sr-only">, </span>
                  {article.reading}
                </p>
                <h3 className="text-[15px] leading-snug font-bold">{article.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{article.summary}</p>
                <UnavailableAction
                  className="mt-auto pt-2 text-xs text-brand-strong"
                  aria-label={`Ler mais: ${article.title}`}
                >
                  Ler mais →
                </UnavailableAction>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
