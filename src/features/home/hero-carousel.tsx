import { Link, type LinkProps } from '@tanstack/react-router'
import { cn } from 'cn'
import { ArrowRight, Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'

import { NftImage } from '@/components/nft-image'
import { usePrefersReducedMotion } from '@/lib/use-media-query'

const ROTATION_MS = 7000

type Slide = {
  eyebrow: string
  title: [string, string]
  description: string
  /** Versão curta usada no card compacto do mobile. */
  short: { title: [string, string]; description: string }
  cta: string
  link: Pick<LinkProps, 'to' | 'search' | 'hash'>
  image: string
  alt: string
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Bem-vindo à Kurio',
    title: ['Seja dono do futuro', 'da arte digital'],
    description:
      'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    short: { title: ['Seja dono da', 'cultura digital'], description: 'Descubra NFTs selecionados de criadores do mundo todo.' },
    cta: 'Explorar',
    link: { to: '/', hash: 'catalogo' },
    image: 'emerald',
    alt: 'Emerald Ape #042: macaco ilustrado de óculos redondos e jaqueta verde',
  },
  {
    eyebrow: 'Edições limitadas',
    title: ['Lançamentos gênesis', 'direto dos criadores'],
    description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    short: { title: ['Lançamentos', 'gênesis'], description: 'Edições escassas direto dos criadores.' },
    cta: 'Ver lançamentos',
    link: { to: '/', search: { tab: 'new' }, hash: 'catalogo' },
    image: 'baron',
    alt: 'Ivory Baron: macaco ilustrado de blazer claro e gola alta verde',
  },
  {
    eyebrow: 'Em alta na semana',
    title: ['As obras mais', 'disputadas do mercado'],
    description: 'Veja os NFTs com mais procura entre colecionadores e acompanhe o que a comunidade está colecionando.',
    short: { title: ['As obras mais', 'disputadas'], description: 'Os NFTs com mais procura da semana.' },
    cta: 'Ver em alta',
    link: { to: '/', search: { tab: 'trending' }, hash: 'catalogo' },
    image: 'golden',
    alt: 'Golden Beat: macaco ilustrado de pelagem dourada usando fones de ouvido',
  },
]

export function HeroCarousel() {
  const reducedMotion = usePrefersReducedMotion()
  const [active, setActive] = useState(0)
  const [userPaused, setUserPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const rotating = !reducedMotion && !userPaused && !interacting

  useEffect(() => {
    if (!rotating) return
    const timer = window.setInterval(() => setActive((index) => (index + 1) % SLIDES.length), ROTATION_MS)
    return () => window.clearInterval(timer)
  }, [rotating])

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques da Kurio"
      className="page-container"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false)
      }}
    >
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-surface-raised to-surface p-4 md:overflow-visible md:rounded-none md:bg-none md:p-0">
        <div aria-live={rotating ? 'off' : 'polite'} className="grid">
          {SLIDES.map((slide, index) => (
            <SlideView key={slide.image} slide={slide} index={index} active={index === active} />
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3 md:mt-0 lg:-mt-12 lg:pl-10">
          <ul className="flex gap-2" aria-label="Escolher destaque">
            {SLIDES.map((slide, index) => (
              <li key={slide.image}>
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Mostrar destaque ${index + 1} de ${SLIDES.length}`}
                  aria-current={index === active ? 'true' : undefined}
                  className="grid size-6 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-2 rounded-full transition-colors',
                      index === active ? 'bg-brand-strong' : 'bg-brand/40 hover:bg-brand/70',
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setUserPaused((paused) => !paused)}
              aria-label={userPaused ? 'Retomar rotação dos destaques' : 'Pausar rotação dos destaques'}
              className="grid size-6 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {userPaused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function SlideView({ slide, index, active }: { slide: Slide; index: number; active: boolean }) {
  const Heading = index === 0 ? 'h1' : 'h2'

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} de ${SLIDES.length}`}
      inert={!active}
      className={cn(
        'col-start-1 row-start-1 grid grid-cols-[1fr_minmax(140px,45vw)] items-center gap-4 transition-opacity duration-500 motion-reduce:transition-none sm:grid-cols-[1fr_200px] md:gap-10 md:py-6 lg:grid-cols-[1fr_450px] lg:pl-10',
        active ? 'opacity-100' : 'invisible opacity-0',
      )}
    >
      <div>
        <p className="text-sm md:text-[15px]">{slide.eyebrow}</p>
        <Heading className="mt-1 text-xl leading-snug font-bold uppercase md:mt-3 md:text-[32px] md:leading-[1.45] lg:text-[44px] lg:leading-[70px]">
          <span className="md:hidden">
            {slide.short.title[0]}
            <br />
            {slide.short.title[1]}
          </span>
          <span className="hidden md:inline">
            {slide.title[0]}
            <br />
            {slide.title[1]}
          </span>
        </Heading>
        <p className="mt-2 max-w-[540px] text-sm leading-6 text-muted-foreground md:text-[15px]">
          <span className="md:hidden">{slide.short.description}</span>
          <span className="hidden md:inline">{slide.description}</span>
        </p>
        <Link
          {...slide.link}
          className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-brand-strong uppercase md:mt-8 md:h-10 md:rounded-md md:bg-primary md:px-7 md:text-[15px] md:text-primary-foreground md:transition-colors md:hover:bg-brand-strong"
        >
          {slide.cta}
          <ArrowRight className="size-4 md:hidden" aria-hidden="true" />
        </Link>
      </div>
      <div className="w-full max-w-[450px] justify-self-end overflow-hidden rounded-2xl md:rounded-[20px]">
        <NftImage
          src={slide.image}
          alt={slide.alt}
          // Mobile: ~45vw para o hero ser o LCP (não o card do catálogo mais abaixo).
          sizes="(min-width: 1024px) 450px, (min-width: 640px) 200px, 45vw"
          priority={index === 0}
        />
      </div>
    </div>
  )
}
