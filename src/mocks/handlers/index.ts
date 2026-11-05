import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers, favoriteHandlers, quoteHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { healthHandlers } from './health'
import { orderHandlers } from './orders'
import { realtimeHandlers } from './realtime'

export const handlers = [
  ...healthHandlers,
  ...authHandlers,
  ...catalogHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...accountHandlers,
  ...realtimeHandlers,
]
