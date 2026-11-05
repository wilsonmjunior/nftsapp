import { Link, type LinkProps } from '@tanstack/react-router'
import { Heart, House, Scan, ShoppingCart, UserRound, type LucideIcon } from 'lucide-react'

type NavEntry = { to: LinkProps['to']; label: string; Icon: LucideIcon; exact?: boolean }

const LEFT: NavEntry[] = [
  { to: '/', label: 'Início', Icon: House, exact: true },
  { to: '/favoritos', label: 'Favoritos', Icon: Heart },
]

const RIGHT: NavEntry[] = [
  { to: '/carrinho', label: 'Carrinho', Icon: ShoppingCart },
  { to: '/perfil', label: 'Perfil', Icon: UserRound },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 h-(--bottom-nav-height) pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div
        className="absolute inset-0 rounded-t-[32px] bg-surface"
        style={{ mask: 'radial-gradient(circle 46px at 50% 0, transparent 98%, #000 100%)' }}
      />
      <ul className="relative grid h-full grid-cols-5 items-center">
        {LEFT.map((entry) => (
          <NavItem key={entry.label} {...entry} />
        ))}
        <li className="flex justify-center">
          <Link
            to="/"
            hash="catalogo"
            aria-label="Explorar NFTs"
            className="grid size-[66px] -translate-y-12 place-items-center rounded-full bg-linear-to-b from-[#8a5a33]/90 to-brand text-foreground shadow-lg shadow-black/40"
          >
            <Scan className="size-7" aria-hidden="true" />
          </Link>
        </li>
        {RIGHT.map((entry) => (
          <NavItem key={entry.label} {...entry} />
        ))}
      </ul>
    </nav>
  )
}

function NavItem({ to, label, Icon, exact }: NavEntry) {
  return (
    <li className="flex justify-center">
      <Link
        to={to}
        activeOptions={{ exact, includeHash: false }}
        aria-label={label}
        className="grid size-12 place-items-center rounded-full text-muted-foreground transition-colors"
        activeProps={{ className: 'text-brand-strong', 'aria-current': 'page' }}
      >
        <Icon className="size-6" fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
      </Link>
    </li>
  )
}
