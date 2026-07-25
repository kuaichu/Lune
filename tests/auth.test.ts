import assert from 'node:assert/strict'
import { createHmac, randomBytes } from 'node:crypto'
import test, { after } from 'node:test'

import {
  AuthConfigurationError,
  SESSION_TTL_SECONDS,
  createSessionToken,
  isAuthConfigured,
  verifySessionToken,
} from '../src/lib/auth'

const ORIGINAL_AUTH_SECRET = process.env.AUTH_SECRET
const TEST_SECRET = 'test-only-auth-secret-with-32-byte-minimum'
const NOW_MS = Date.UTC(2026, 0, 1)

after(() => {
  if (ORIGINAL_AUTH_SECRET === undefined) {
    delete process.env.AUTH_SECRET
  } else {
    process.env.AUTH_SECRET = ORIGINAL_AUTH_SECRET
  }
})

test('creates and verifies a 30-day signed session', () => {
  process.env.AUTH_SECRET = TEST_SECRET

  const token = createSessionToken('admin', NOW_MS)
  const session = verifySessionToken(token, NOW_MS)

  assert.deepEqual(session, {
    version: 1,
    username: 'admin',
    issuedAt: Math.floor(NOW_MS / 1000),
    expiresAt: Math.floor(NOW_MS / 1000) + SESSION_TTL_SECONDS,
  })
  assert.notEqual(
    verifySessionToken(token, NOW_MS + (SESSION_TTL_SECONDS - 1) * 1000),
    null
  )
})

test('rejects arbitrary, tampered, expired, and wrong-secret tokens', () => {
  process.env.AUTH_SECRET = TEST_SECRET

  const token = createSessionToken('admin', NOW_MS)

  assert.equal(verifySessionToken('anything', NOW_MS), null)
  for (let index = 0; index < token.length; index += 1) {
    const replacement = token[index] === 'a' ? 'b' : 'a'
    const tampered = `${token.slice(0, index)}${replacement}${token.slice(index + 1)}`
    assert.equal(verifySessionToken(tampered, NOW_MS), null, `tampered character ${index}`)
  }
  assert.equal(
    verifySessionToken(token, NOW_MS + SESSION_TTL_SECONDS * 1000),
    null
  )

  process.env.AUTH_SECRET = 'different-test-secret-with-32-byte-minimum'
  assert.equal(verifySessionToken(token, NOW_MS), null)
})

test('fails closed for missing, blank, short, and 31-byte AUTH_SECRET values', () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const validToken = createSessionToken('admin', NOW_MS)

  const invalidSecrets: Array<string | undefined> = [
    undefined,
    '',
    ' '.repeat(32),
    `a${' '.repeat(31)}`,
    'short-secret',
    '密'.repeat(10) + 'a',
  ]

  assert.equal(Buffer.byteLength(invalidSecrets.at(-1)!, 'utf8'), 31)

  for (const secret of invalidSecrets) {
    if (secret === undefined) {
      delete process.env.AUTH_SECRET
    } else {
      process.env.AUTH_SECRET = secret
    }

    assert.equal(isAuthConfigured(), false)
    assert.equal(verifySessionToken(validToken, NOW_MS), null)
    assert.throws(
      () => createSessionToken('admin', NOW_MS),
      (error) => error instanceof AuthConfigurationError
    )
  }
})

test('accepts an AUTH_SECRET at the 32-byte UTF-8 boundary', () => {
  const boundarySecret = '密'.repeat(10) + 'ab'
  assert.equal(Buffer.byteLength(boundarySecret, 'utf8'), 32)

  process.env.AUTH_SECRET = boundarySecret
  assert.equal(isAuthConfigured(), true)

  const token = createSessionToken('admin', NOW_MS)
  assert.equal(verifySessionToken(token, NOW_MS)?.username, 'admin')
})

test('accepts 32 non-whitespace ASCII characters as AUTH_SECRET', () => {
  process.env.AUTH_SECRET = 'a'.repeat(32)

  assert.equal(isAuthConfigured(), true)
  const token = createSessionToken('admin', NOW_MS)
  assert.equal(verifySessionToken(token, NOW_MS)?.username, 'admin')
})

test('accepts a Base64URL AUTH_SECRET generated from 32 random bytes', () => {
  process.env.AUTH_SECRET = randomBytes(32).toString('base64url')

  assert.equal(isAuthConfigured(), true)
  const token = createSessionToken('admin', NOW_MS)
  assert.equal(verifySessionToken(token, NOW_MS)?.username, 'admin')
})

test('rejects correctly signed payloads with invalid version, issuedAt, expiresAt, or TTL', () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const issuedAt = Math.floor(NOW_MS / 1000)
  const validPayload = {
    version: 1,
    username: 'admin',
    issuedAt,
    expiresAt: issuedAt + SESSION_TTL_SECONDS,
  }

  const invalidPayloads = [
    { ...validPayload, version: 2 },
    {
      ...validPayload,
      issuedAt: issuedAt + 1,
      expiresAt: issuedAt + 1 + SESSION_TTL_SECONDS,
    },
    { ...validPayload, issuedAt: issuedAt + 0.5 },
    { ...validPayload, expiresAt: issuedAt },
    { ...validPayload, expiresAt: 'invalid' },
    { ...validPayload, expiresAt: issuedAt + SESSION_TTL_SECONDS + 1 },
  ]

  for (const payload of invalidPayloads) {
    assert.equal(verifySessionToken(signPayload(payload), NOW_MS), null)
  }
})

function signPayload(payload: unknown): string {
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signaturePart = createHmac('sha256', TEST_SECRET)
    .update(payloadPart)
    .digest('base64url')
  return `${payloadPart}.${signaturePart}`
}
