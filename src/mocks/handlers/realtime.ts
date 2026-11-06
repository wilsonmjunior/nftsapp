import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'

import {
  authenticateToken,
  registerRealtimeClient,
  startRealtimeHub,
} from '../realtime-hub'

startRealtimeHub()

// `*` porque o socket pode apontar para a origem da página ou para o host do .env; com host fixo o MSW deixa passar.
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
