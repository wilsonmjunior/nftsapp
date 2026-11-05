import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Link, Outlet, useLocation } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { AnnouncerProvider } from '@/components/a11y/announcer'
import { BottomNav } from '@/components/layout/bottom-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { MAIN_CONTENT_ID, SkipLink } from '@/components/layout/skip-link'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { env } from '@/env'
import { rootSearch } from '@/features/session/auth-dialog-state'
import { AuthDialog } from '@/features/session/components/auth-dialog'
import { RealtimeSync } from '@/features/realtime/realtime-sync'
import { SessionSync } from '@/features/session/session-sync'

const Devtools = import.meta.env.DEV ? lazy(() => import('@/components/devtools')) : null
const MockPanel = env.VITE_ENABLE_MOCKS && env.VITE_MOCK_PANEL ? lazy(() => import('@/mocks/mock-panel')) : null

type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: rootSearch,
  head: () => ({
    meta: [
      { title: 'Kurio — Marketplace de NFTs' },
      {
        name: 'description',
        content: 'Kurio: descubra, colecione e compre NFTs de criadores emergentes e consagrados.',
      },
    ],
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
})

/** No mobile, login e cadastro são telas inteiras, sem rodapé nem barra inferior (como no Figma). */
const FOCUSED_PAGES = ['/login', '/cadastro']

function RootLayout() {
  const { pathname } = useLocation()
  const focused = FOCUSED_PAGES.includes(pathname)

  return (
    <AnnouncerProvider>
      <TooltipProvider>
        <HeadContent />
        <SessionSync />
        <RealtimeSync />
        <SkipLink />
        <SiteHeader />
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="outline-none">
          <Outlet />
        </main>
        <div className={focused ? 'max-md:hidden' : undefined}>
          <SiteFooter />
        </div>
        {!focused && <BottomNav />}
        <AuthDialog />
        <Toaster position="top-center" />
        {MockPanel && (
          <Suspense>
            <MockPanel />
          </Suspense>
        )}
        {Devtools && (
          <Suspense>
            <Devtools />
          </Suspense>
        )}
      </TooltipProvider>
    </AnnouncerProvider>
  )
}

function NotFound() {
  return (
    <div className="page-container flex min-h-[50svh] flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço acessado não existe ou foi removido.</p>
      <Link to="/" className="text-brand-strong underline underline-offset-4">
        Voltar para o início
      </Link>
    </div>
  )
}
