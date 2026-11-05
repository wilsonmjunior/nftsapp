const ITERATIONS = 100_000
const encoder = new TextEncoder()

function toHex(buffer: ArrayBuffer | Uint8Array) {
  return Array.from(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function fromHex(hex: string) {
  return new Uint8Array(hex.match(/../g)!.map((byte) => Number.parseInt(byte, 16)))
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return toHex(bits)
}

/** Formato: `pbkdf2$<iterações>$<salt hex>$<hash hex>`. A senha nunca é guardada. */
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${await derive(password, salt, ITERATIONS)}`
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false
  const [scheme, iterations, salt, hash] = stored.split('$')
  if (scheme !== 'pbkdf2' || !iterations || !salt || !hash) return false
  return (await derive(password, fromHex(salt), Number(iterations))) === hash
}

export function randomToken(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`
}

/** Hash estável para comparar payloads de idempotência. */
export async function digest(value: unknown) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(stableStringify(value)))
  return toHex(bytes)
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}
