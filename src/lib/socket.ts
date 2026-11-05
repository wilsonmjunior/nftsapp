import type { Socket } from 'socket.io-client'

import { env } from '@/env'
import { sessionToken } from '@/lib/session-token'
import { mocksReady } from '@/mocks/ready'

/**
 * Com mocks, o socket usa a mesma origem da página para o MSW interceptar o WebSocket.
 * Hosts cruzados caem no WebSocket nativo (DNS) e falham.
 */
export function resolveSocketUrl() {
  if (env.VITE_ENABLE_MOCKS && typeof window !== 'undefined') {
    return window.location.origin
  }
  return env.VITE_SOCKET_URL
}

/**
 * Import dinâmico de `socket.io-client`: o módulo captura `WebSocket` na avaliação.
 * Se importarmos no top-level via a árvore de rotas, isso acontece ANTES do MSW patchar.
 */
let socketInstance: Socket | null = null
let socketReady: Promise<Socket> | null = null

async function ensureSocket() {
  if (socketInstance) return socketInstance
  if (!socketReady) {
    socketReady = import('socket.io-client').then(({ io }) => {
      socketInstance = io(resolveSocketUrl(), {
        transports: ['websocket'],
        autoConnect: false,
      })
      return socketInstance
    })
  }
  return socketReady
}

export function getSocket() {
  if (!socketInstance) {
    throw new Error('Socket ainda não inicializado. Chame connectSocket() antes.')
  }
  return socketInstance
}

export async function connectSocket() {
  await mocksReady
  const client = await ensureSocket()
  client.auth = { token: sessionToken.get() }
  if (!client.connected) client.connect()
  return client
}

export function disconnectSocket() {
  socketInstance?.disconnect()
}

export function installSocketTestBridge() {
  if (!env.VITE_ENABLE_MOCKS || typeof window === 'undefined') return
  Object.assign(window, {
    __kurioSocket: {
      connected: () => Boolean(socketInstance?.connected),
      disconnect: () => disconnectSocket(),
      reconnect: () => {
        void connectSocket()
      },
      id: () => socketInstance?.id,
    },
  })
}
