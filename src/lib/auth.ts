import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE_NAME = 'onenav_token'
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

const SESSION_VERSION = 1
const MIN_AUTH_SECRET_BYTES = 32

export type Session = {
  version: typeof SESSION_VERSION
  username: string
  issuedAt: number
  expiresAt: number
}

export class AuthConfigurationError extends Error {
  constructor() {
    super('AUTH_SECRET 不得包含空白字符，且必须至少 32 字节')
    this.name = 'AuthConfigurationError'
  }
}

function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET
  if (typeof secret !== 'string' || /\s/u.test(secret)) return null
  return Buffer.byteLength(secret, 'utf8') >= MIN_AUTH_SECRET_BYTES ? secret : null
}

export function isAuthConfigured(): boolean {
  return getAuthSecret() !== null
}

export function createSessionToken(username: string, nowMs = Date.now()): string {
  const secret = getAuthSecret()
  if (!secret) throw new AuthConfigurationError()
  if (!username) throw new TypeError('Session username must not be empty')

  const issuedAt = Math.floor(nowMs / 1000)
  const payload: Session = {
    version: SESSION_VERSION,
    username,
    issuedAt,
    expiresAt: issuedAt + SESSION_TTL_SECONDS,
  }
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signaturePart = sign(payloadPart, secret).toString('base64url')

  return `${payloadPart}.${signaturePart}`
}

export function verifySessionToken(token: string | undefined, nowMs = Date.now()): Session | null {
  const secret = getAuthSecret()
  if (!secret || !token) return null

  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null

  const [payloadPart, signaturePart] = parts
  const providedSignature = decodeCanonicalBase64Url(signaturePart)
  if (!providedSignature) return null

  const expectedSignature = sign(payloadPart, secret)
  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null
  }

  const payloadBuffer = decodeCanonicalBase64Url(payloadPart)
  if (!payloadBuffer) return null

  let payload: unknown
  try {
    payload = JSON.parse(payloadBuffer.toString('utf8'))
  } catch {
    return null
  }

  if (!isSession(payload)) return null

  const now = Math.floor(nowMs / 1000)
  if (
    payload.issuedAt > now ||
    payload.expiresAt <= now ||
    payload.expiresAt !== payload.issuedAt + SESSION_TTL_SECONDS
  ) {
    return null
  }

  return payload
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  }
}

function sign(payloadPart: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payloadPart).digest()
}

function decodeCanonicalBase64Url(value: string): Buffer | null {
  try {
    const decoded = Buffer.from(value, 'base64url')
    return decoded.toString('base64url') === value ? decoded : null
  } catch {
    return null
  }
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false

  const session = value as Partial<Session>
  return (
    session.version === SESSION_VERSION &&
    typeof session.username === 'string' &&
    session.username.length > 0 &&
    Number.isSafeInteger(session.issuedAt) &&
    Number.isSafeInteger(session.expiresAt)
  )
}
