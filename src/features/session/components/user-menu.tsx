import { Link } from '@tanstack/react-router'
import { ChevronDown, Heart, LogOut, UserRound, Wallet } from 'lucide-react'

import type { User } from '@/api/contracts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useLogout } from '../use-logout'

export function UserAvatar({ user, className = 'size-8' }: { user: User; className?: string }) {
  const initials = user.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" width={32} height={32} className={`${className} rounded-full object-cover`} />
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} grid place-items-center rounded-full bg-brand text-xs font-bold text-primary-foreground`}
    >
      {initials}
    </span>
  )
}

export function UserMenu({ user }: { user: User }) {
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-0.5 pr-1 pl-0.5 transition-colors hover:text-brand-strong data-[state=open]:text-brand-strong">
        <UserAvatar user={user} />
        <span className="sr-only">Conta de {user.displayName}</span>
        <span className="hidden max-w-32 truncate text-sm lg:inline" aria-hidden="true">
          {user.displayName}
        </span>
        <ChevronDown className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid">
          <span className="truncate">{user.displayName}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <UserRound aria-hidden="true" />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil/carteiras">
            <Wallet aria-hidden="true" />
            Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/favoritos">
            <Heart aria-hidden="true" />
            Favoritos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}>
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
