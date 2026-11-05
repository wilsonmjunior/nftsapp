import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'

import {
  authenticateToken,
  registerRealtimeClient,
  startRealtimeHub,
} from '../realtime-hub'

startRealtimeHub()

/**
 * `*` cobre a origem da página (mocks) e o host do .env.
 * Matching estrito por host falhava no preview e o interceptor fazia passthrough.
 */
export const realtimeHandlers = [
  ws.link('*').addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    const registration = registerRealtimeClient(io.client)
    io.client.on('auth', (_event, payload: { token?: string } | undefined) => {
      const userId = authenticateToken(payload?.token)
      registration.setUserId(userId)
      io.client.emit('auth:ok', { userId })
    })

    io.client.on('ping', () => {
      io.client.emit('pong', { at: Date.now() })
    })

    connection.client.addEventListener('close', () => {
      registration.dispose()
    })
  }),
]
