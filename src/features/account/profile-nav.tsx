import { Link, useRouterState } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'

import { UnavailableAction } from '@/components/unavailable-action'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/features/session/use-logout'
import { cn } from 'cn'

const LINKS = [
  { to: '/perfil', label: 'Meu perfil', exact: true },
  { to: '/perfil/carteiras', label: 'Carteiras', exact: false },
] as const

const UNAVAILABLE = ['Atividade', 'Lista de interesse', 'Ofertas', 'Arquivos baixados', 'Suporte'] as const

function isActive(pathname: string, to: string, exact: boolean) {
  if (exact) return pathname === to || pathname === `${to}/`
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function ProfileNav({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const logout = useLogout()

  return (
    <nav aria-label="Menu do perfil" className={cn('grid gap-1', className)}>
      <p className="mb-2 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Meu perfil</p>
      {LINKS.map((item) => {
        const active = isActive(pathname, item.to, item.exact)
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-2.5 text-sm transition-colors',
              active ? 'bg-brand/15 font-bold text-brand-strong' : 'text-foreground hover:bg-page hover:text-brand-strong',
            )}
          >
            {item.label}
          </Link>
        )
      })}

      <div className="my-2 border-t border-border" />

      {UNAVAILABLE.map((label) => (
        <UnavailableAction
          key={label}
          className="rounded-md px-3 py-2.5 text-sm text-muted-foreground opacity-70"
        >
          {label}
        </UnavailableAction>
      ))}

      <div className="my-2 border-t border-border" />

      <Button
        type="button"
        variant="ghost"
        className="justify-start px-3 text-sm"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sair da conta
      </Button>
    </nav>
  )
}

/** Navegação compacta no topo (mobile). */
export function ProfileNavMobile() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const logout = useLogout()

  return (
    <div className="grid gap-3 md:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Seções do perfil">
        {LINKS.map((item) => {
          const active = isActive(pathname, item.to, item.exact)
          return (
            <Link
              key={item.to}
              to={item.to}
              role="tab"
              aria-selected={active}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm',
                active ? 'border-brand bg-brand/15 font-bold text-brand-strong' : 'border-border text-muted-foreground',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      <details className="rounded-lg border border-border bg-surface px-3 py-2">
        <summary className="cursor-pointer text-sm text-muted-foreground">Mais opções</summary>
        <div className="mt-2 grid gap-1">
          {UNAVAILABLE.map((label) => (
            <UnavailableAction key={label} className="rounded-md px-2 py-2 text-sm text-muted-foreground opacity-70">
              {label}
            </UnavailableAction>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="justify-start px-2 text-sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sair da conta
          </Button>
        </div>
      </details>
    </div>
  )
}
