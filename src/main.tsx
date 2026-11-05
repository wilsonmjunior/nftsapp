import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { env } from '@/env'
import { queryClient } from '@/lib/query-client'
import { markMocksReady } from '@/mocks/ready'

import { routeTree } from './routeTree.gen'
import '@fontsource/roboto-mono/latin-400.css'
import '@fontsource/roboto-mono/latin-500.css'
import '@fontsource/roboto-mono/latin-700.css'
import './index.css'

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

async function enableMocking() {
  if (!env.VITE_ENABLE_MOCKS) {
    markMocksReady()
    return
  }

  const { startMocks } = await import('@/mocks/browser')
  await startMocks()
  const { installSocketTestBridge } = await import('@/lib/socket')
  installSocketTestBridge()
  markMocksReady()
}

// Monta a UI imediatamente (hero estático = candidato a LCP).
// O MSW sobe em paralelo; Axios espera `mocksReady` antes de ir à rede.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

void enableMocking()
