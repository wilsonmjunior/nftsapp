const MAX = 200
const seen = new Set<string>()
const order: string[] = []

/** Deduplicação por `eventId` com limite para não crescer sem fim. */
export function rememberEventId(eventId: string) {
  if (seen.has(eventId)) return false
  seen.add(eventId)
  order.push(eventId)
  if (order.length > MAX) {
    const oldest = order.shift()
    if (oldest) seen.delete(oldest)
  }
  return true
}

export function clearSeenEvents() {
  seen.clear()
  order.length = 0
}
