import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'

import { googleClientId } from '@/env'

import { fail } from './route'

const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com'])
let googleJwks: JWTVerifyGetKey | null = null

function jwks() {
  googleJwks ??= createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
  return googleJwks
}

/** Prefixo de token aceito só pelo mock (E2E / painel), sem chamar o Google. */
export const MOCK_GOOGLE_TOKEN_PREFIX = 'mock.'

export type GoogleClaims = {
  sub: string
  email: string
  name: string | null
  picture: string | null
}

function decodeMockToken(idToken: string): GoogleClaims {
  try {
    const payload = JSON.parse(atob(idToken.slice(MOCK_GOOGLE_TOKEN_PREFIX.length))) as {
      sub?: string
      email?: string
      name?: string
      picture?: string
      exp?: number
    }
    if (!payload.sub || !payload.email) throw new Error('incomplete')
    if (payload.exp !== undefined && payload.exp * 1000 < Date.now()) throw new Error('expired')
    return {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: payload.name?.trim() || null,
      picture: payload.picture?.trim() || null,
    }
  } catch {
    throw fail(401, 'UNAUTHORIZED', 'Token do Google inválido.')
  }
}

export function createMockGoogleIdToken(claims: {
  email: string
  name?: string
  picture?: string
  sub?: string
  /** Segundos até expirar; padrão 1h. */
  expiresInSec?: number
}) {
  const payload = {
    sub: claims.sub ?? `google-mock-${claims.email}`,
    email: claims.email.trim().toLowerCase(),
    name: claims.name,
    picture: claims.picture,
    exp: Math.floor(Date.now() / 1000) + (claims.expiresInSec ?? 3600),
  }
  return `${MOCK_GOOGLE_TOKEN_PREFIX}${btoa(JSON.stringify(payload))}`
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleClaims> {
  if (idToken.startsWith(MOCK_GOOGLE_TOKEN_PREFIX)) {
    return decodeMockToken(idToken)
  }

  const audience = googleClientId()
  if (!audience) throw fail(503, 'TRANSIENT', 'Login com Google não está configurado.')

  try {
    const { payload } = await jwtVerify(idToken, jwks(), {
      audience,
      issuer: [...GOOGLE_ISSUERS],
    })
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
    const sub = typeof payload.sub === 'string' ? payload.sub : ''
    if (!email || !sub) throw new Error('missing claims')
    if (payload.email_verified === false) throw new Error('email not verified')

    return {
      sub,
      email,
      name: typeof payload.name === 'string' ? payload.name.trim() : null,
      picture: typeof payload.picture === 'string' ? payload.picture.trim() : null,
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) throw error
    throw fail(401, 'UNAUTHORIZED', 'Token do Google inválido ou expirado.')
  }
}
