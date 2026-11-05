import { Link } from '@tanstack/react-router'
import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  XTwitterIcon,
  YoutubeIcon,
} from '@/components/brand-icons'
import { UnavailableAction } from '@/components/unavailable-action'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    description: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    description: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    description: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const HELP_LINKS = ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item']
const COLLECTION_LINKS = ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade']

const SOCIAL_LINKS = [
  { label: 'Facebook', href: 'https://www.facebook.com', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com', Icon: InstagramIcon },
  { label: 'X (Twitter)', href: 'https://x.com', Icon: XTwitterIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com', Icon: LinkedinIcon },
  { label: 'YouTube', href: 'https://www.youtube.com', Icon: YoutubeIcon },
]

const linkClass = 'text-sm transition-colors hover:text-brand-strong'

export function SiteFooter() {
  return (
    <footer className="page-container mt-24 pb-[calc(var(--bottom-nav-height)+1rem)] md:pb-0">
      <section aria-label="Benefícios e novidades" className="bg-surface px-6 py-8 sm:px-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {FEATURES.map((feature) => (
            <div key={feature.letter} className="lg:border-r lg:border-brand/60 lg:pr-6 lg:not-first:pl-6">
              <span
                aria-hidden="true"
                className="grid size-[74px] place-items-center rounded-full bg-brand text-xl font-bold text-primary-foreground"
              >
                {feature.letter}
              </span>
              <h2 className="mt-4 text-base font-bold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
          <NewsletterForm />
        </div>
      </section>

      <div className="grid gap-4 bg-band px-6 py-6 text-sm sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:items-center lg:py-[26px]">
        <span className="font-bold tracking-[0.12em]">KURIO</span>
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com" className={linkClass}>
          contato@email.com
        </a>
        <a href="tel:+551140028922" className={linkClass}>
          +55 11 4002 8922
        </a>
      </div>

      <nav aria-label="Rodapé" className="grid gap-8 bg-surface px-6 py-8 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <FooterColumn title="Meu perfil">
          <li>
            <Link to="/perfil" className={linkClass}>
              Meu perfil
            </Link>
          </li>
          {['Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'].map((label) => (
            <li key={label}>
              <UnavailableAction className={linkClass}>{label}</UnavailableAction>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Central de ajuda">
          {HELP_LINKS.map((label) => (
            <li key={label}>
              <UnavailableAction className={linkClass}>{label}</UnavailableAction>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Coleções">
          {COLLECTION_LINKS.map((label) => (
            <li key={label}>
              <Link to="/" hash="catalogo" className={linkClass}>
                {label}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <div>
          <h2 className="text-lg font-bold">Redes sociais</h2>
          <ul className="mt-3 flex gap-2">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} (abre em nova aba)`}
                  className="grid size-8 place-items-center rounded-sm border border-brand text-brand transition-colors hover:bg-brand hover:text-primary-foreground"
                >
                  <Icon className="size-4" />
                </a>
              </li>
            ))}
          </ul>

          <h2 className="mt-6 text-lg font-bold">Carteiras compatíveis</h2>
          <p className="mt-3 inline-block rounded-sm bg-band px-2 py-1 text-[10px] font-bold tracking-wide text-brand-strong">
            METAMASK · WALLETCONNECT · COINBASE
          </p>
        </div>
      </nav>

      <p className="py-5 text-center text-sm">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="mt-3 space-y-2.5">{children}</ul>
    </div>
  )
}

function NewsletterForm() {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = event.currentTarget.elements.namedItem('email') as HTMLInputElement

    if (!input.validity.valid) {
      setError(input.value ? 'Digite um e-mail válido.' : 'Informe seu e-mail.')
      input.focus()
      return
    }

    setError(null)
    toast.info('A inscrição na newsletter não faz parte da demonstração.')
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="lg:pl-3">
      <label htmlFor={inputId} className="block text-base leading-tight font-bold">
        Antecipe-se ao próximo lançamento
      </label>
      <div className="mt-3 flex">
        <input
          id={inputId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="digite seu e-mail..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          className="h-[46px] min-w-0 flex-1 bg-band px-3 text-sm placeholder:text-subtle aria-invalid:outline aria-invalid:outline-required"
        />
        <button
          type="submit"
          className="h-[46px] bg-brand px-4 text-base font-bold text-primary-foreground transition-colors hover:bg-brand-strong"
        >
          Enviar
        </button>
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-sm text-required">
          {error}
        </p>
      )}
      <p id={hintId} className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </form>
  )
}
