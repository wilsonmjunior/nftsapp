import { Link, useLocation } from '@tanstack/react-router'
import { cn } from 'cn'
import { LogIn, Search, ShoppingCart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UnavailableAction } from '@/components/unavailable-action'
import { useCartItemCount } from '@/features/cart/use-cart'
import { UserMenu } from '@/features/session/components/user-menu'
import { useSession } from '@/features/session/use-session'

const MARKET_PATHS = ['/nfts', '/carrinho', '/pagamento', '/checkout', '/pedidos']

const navItem =
  'flex h-full items-center border-b-2 border-transparent text-[15px] transition-colors hover:text-brand-strong'

export function SiteHeader() {
  const { pathname } = useLocation()
  const isMarket = MARKET_PATHS.some((path) => pathname.startsWith(path))
  const cartCount = useCartItemCount()

  return (
    <header className="hidden md:block">
      <div className="page-container">
        <div className="flex h-[68px] items-center justify-between gap-6 border-b border-border">
          <Link to="/" className="text-sm font-bold tracking-[0.12em]" aria-label="Kurio, página inicial">
            KURIO
          </Link>

          <nav aria-label="Principal" className="h-full">
            <ul className="flex h-full items-center gap-8 lg:gap-10">
              <li className="h-full">
                <Link
                  to="/"
                  activeOptions={{ exact: true, includeHash: false }}
                  className={navItem}
                  activeProps={{ className: 'border-brand-strong font-bold text-brand-strong', 'aria-current': 'page' }}
                >
                  Início
                </Link>
              </li>
              <li className="h-full">
                <Link
                  to="/"
                  hash="catalogo"
                  className={cn(navItem, isMarket && 'border-brand-strong font-bold text-brand-strong')}
                  aria-current={isMarket ? 'page' : undefined}
                >
                  Mercado
                </Link>
              </li>
              <li className="h-full">
                <UnavailableAction className={navItem}>Criadores</UnavailableAction>
              </li>
              <li className="h-full">
                <UnavailableAction className={navItem}>Aprenda</UnavailableAction>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-5">
            <Link
              to="/"
              hash="busca"
              aria-label="Buscar NFTs"
              className="rounded-sm p-1 transition-colors hover:text-brand-strong"
            >
              <Search className="size-[22px]" aria-hidden="true" />
            </Link>
            <Link
              to="/carrinho"
              aria-label={cartCount > 0 ? `Carrinho, ${cartCount} itens` : 'Carrinho'}
              className="relative rounded-sm p-1 transition-colors hover:text-brand-strong"
            >
              <ShoppingCart className="size-[22px]" aria-hidden="true" />
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] leading-4 font-bold text-primary-foreground"
                >
                  {cartCount}
                </span>
              )}
            </Link>
            <AccountSlot />
          </div>
        </div>
      </div>
    </header>
  )
}

function AccountSlot() {
  const { user, status } = useSession()
  const { pathname } = useLocation()

  if (status === 'pending') return <Skeleton className="h-8 w-[86px] rounded-md" />
  if (user) return <UserMenu user={user} />

  const onAuthPage = pathname === '/login' || pathname === '/cadastro'

  return (
    <Button asChild size="sm" className="h-8 gap-1.5 px-2 text-[15px] font-medium">
      {onAuthPage ? (
        <Link to="/login">
          <LogIn aria-hidden="true" />
          Entrar
        </Link>
      ) : (
        <Link to="." search={(prev) => ({ ...prev, auth: 'login' as const })} state={{ authDialog: true }}>
          <LogIn aria-hidden="true" />
          Entrar
        </Link>
      )}
    </Button>
  )
}
