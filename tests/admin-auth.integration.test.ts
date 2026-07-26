import assert from 'node:assert/strict'
import Module from 'node:module'
import { resolve } from 'node:path'
import test, { after } from 'node:test'

import { NextRequest } from 'next/server'

import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from '../src/lib/auth'

const ORIGINAL_AUTH_SECRET = process.env.AUTH_SECRET
const TEST_SECRET = 'endpoint-auth-test-secret-with-32-byte-minimum'
const fixturePath = (name: string) => resolve('tests', 'fixtures', name)

type ResolveFilename = (
  request: string,
  parent: { filename?: string } | undefined,
  isMain: boolean,
  options?: unknown
) => string

const moduleWithResolver = Module as typeof Module & { _resolveFilename: ResolveFilename }
const originalResolveFilename = moduleWithResolver._resolveFilename

moduleWithResolver._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'server-only') {
    return fixturePath('server-only.cjs')
  }
  if (request === 'next/headers') {
    return fixturePath('headers.ts')
  }
  if (
    request === '@/lib/prisma' ||
    (request === './prisma' && parent?.filename?.replaceAll('\\', '/').includes('/src/lib/auth-server'))
  ) {
    return fixturePath('prisma.ts')
  }
  return originalResolveFilename.call(this, request, parent, isMain, options)
}

after(() => {
  moduleWithResolver._resolveFilename = originalResolveFilename
  if (ORIGINAL_AUTH_SECRET === undefined) {
    delete process.env.AUTH_SECRET
  } else {
    process.env.AUTH_SECRET = ORIGINAL_AUTH_SECRET
  }
})

function request(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {}
) {
  const headers = new Headers()
  if (options.token !== undefined) {
    headers.set('cookie', `${SESSION_COOKIE_NAME}=${options.token}`)
  }
  if (options.body !== undefined) {
    headers.set('content-type', 'application/json')
  }

  return new NextRequest(`http://test.local${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
}

async function loadProtectedRoutes() {
  const [categories, category, links, link, settings, info] = await Promise.all([
    import('../src/app/api/categories/route'),
    import('../src/app/api/categories/[id]/route'),
    import('../src/app/api/links/route'),
    import('../src/app/api/links/[id]/route'),
    import('../src/app/api/settings/site/route'),
    import('../src/app/api/info/route'),
  ])

  const categoryContext = { params: Promise.resolve({ id: '1' }) }
  const linkContext = { params: Promise.resolve({ id: '1' }) }

  return {
    unauthorizedCases(token: string | undefined) {
      return [
        ['GET /api/categories', () => categories.GET(request('/api/categories', { token }))],
        ['POST /api/categories', () => categories.POST(request('/api/categories', { method: 'POST', token, body: {} }))],
        ['GET /api/categories/[id]', () => category.GET(request('/api/categories/1', { token }), categoryContext)],
        ['PUT /api/categories/[id]', () => category.PUT(request('/api/categories/1', { method: 'PUT', token, body: {} }), categoryContext)],
        ['DELETE /api/categories/[id]', () => category.DELETE(request('/api/categories/1', { method: 'DELETE', token }), categoryContext)],
        ['GET /api/links', () => links.GET(request('/api/links', { token }))],
        ['POST /api/links', () => links.POST(request('/api/links', { method: 'POST', token, body: {} }))],
        ['GET /api/links/[id]', () => link.GET(request('/api/links/1', { token }), linkContext)],
        ['PUT /api/links/[id]', () => link.PUT(request('/api/links/1', { method: 'PUT', token, body: {} }), linkContext)],
        ['DELETE /api/links/[id]', () => link.DELETE(request('/api/links/1', { method: 'DELETE', token }), linkContext)],
        ['GET /api/settings/site', () => settings.GET(request('/api/settings/site', { token }))],
        ['PUT /api/settings/site', () => settings.PUT(request('/api/settings/site', { method: 'PUT', token, body: {} }))],
        ['GET /api/info', () => info.GET(request('/api/info', { token }))],
      ] as const
    },
    validCases(token: string) {
      return [
        ['GET /api/categories', () => categories.GET(request('/api/categories', { token }))],
        ['POST /api/categories', () => categories.POST(request('/api/categories', { method: 'POST', token, body: { name: 'New', parentId: null } }))],
        ['GET /api/categories/[id]', () => category.GET(request('/api/categories/1', { token }), categoryContext)],
        ['PUT /api/categories/[id]', () => category.PUT(request('/api/categories/1', { method: 'PUT', token, body: { name: 'Updated' } }), categoryContext)],
        ['DELETE /api/categories/[id]', () => category.DELETE(request('/api/categories/1', { method: 'DELETE', token }), categoryContext)],
        ['GET /api/links', () => links.GET(request('/api/links', { token }))],
        ['POST /api/links', () => links.POST(request('/api/links', { method: 'POST', token, body: { title: 'New', url: 'https://example.com', categoryId: 1 } }))],
        ['GET /api/links/[id]', () => link.GET(request('/api/links/1', { token }), linkContext)],
        ['PUT /api/links/[id]', () => link.PUT(request('/api/links/1', { method: 'PUT', token, body: { title: 'Updated', url: 'https://example.com' } }), linkContext)],
        ['DELETE /api/links/[id]', () => link.DELETE(request('/api/links/1', { method: 'DELETE', token }), linkContext)],
        ['GET /api/settings/site', () => settings.GET(request('/api/settings/site', { token }))],
        ['PUT /api/settings/site', () => settings.PUT(request('/api/settings/site', { method: 'PUT', token, body: { title: 'Lune' } }))],
        ['GET /api/info', () => info.GET(request('/api/info', { token }))],
      ] as const
    },
  }
}

for (const scenario of [
  { name: 'without a cookie', token: () => undefined },
  { name: 'with an arbitrary forged cookie', token: () => 'forged.token' },
  {
    name: 'with a correctly signed but expired cookie',
    token: () => createSessionToken('admin', Date.now() - (SESSION_TTL_SECONDS + 60) * 1000),
  },
]) {
  test(`all management handlers return 401 ${scenario.name} before touching data`, async () => {
    process.env.AUTH_SECRET = TEST_SECRET
    const routes = await loadProtectedRoutes()
    const prisma = await import('./fixtures/prisma')
    prisma.resetPrismaCalls()

    for (const [name, call] of routes.unauthorizedCases(scenario.token())) {
      const response = await call()
      assert.equal(response.status, 401, name)
      assert.deepEqual(await response.json(), { code: -1, err_msg: '未登录' }, name)
    }

    assert.deepEqual(prisma.getPrismaCalls(), [])
  })
}

test('a valid session preserves all management handler GET and write behavior', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const token = createSessionToken('admin')
  const routes = await loadProtectedRoutes()

  for (const [name, call] of routes.validCases(token)) {
    const response = await call()
    assert.equal(response.status, 200, name)
    assert.equal((await response.json()).code, 0, name)
  }
})

test('/admin server layout redirects invalid sessions and renders for a valid session', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const [{ default: AdminLayout }, headers] = await Promise.all([
    import('../src/app/admin/layout'),
    import('./fixtures/headers'),
  ])

  for (const token of [
    undefined,
    'forged.token',
    createSessionToken('admin', Date.now() - (SESSION_TTL_SECONDS + 60) * 1000),
  ]) {
    headers.setSessionToken(token)
    await assert.rejects(
      () => AdminLayout({ children: null }),
      (error: unknown) => {
        const digest = (error as { digest?: unknown } | null)?.digest
        return typeof digest === 'string' && digest.includes('NEXT_REDIRECT;replace;/login;')
      }
    )
  }

  headers.setSessionToken(createSessionToken('admin'))
  const rendered = await AdminLayout({ children: null })
  assert.ok(rendered)
})

test('/admin data Server Components reject invalid sessions before querying Prisma', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const [dashboard, categories, links, headers, prisma] = await Promise.all([
    import('../src/app/admin/page'),
    import('../src/app/admin/categories/page'),
    import('../src/app/admin/links/page'),
    import('./fixtures/headers'),
    import('./fixtures/prisma'),
  ])
  const pages = [dashboard.default, categories.default, links.default]

  for (const token of [
    undefined,
    'forged.token',
    createSessionToken('admin', Date.now() - (SESSION_TTL_SECONDS + 60) * 1000),
  ]) {
    headers.setSessionToken(token)

    for (const page of pages) {
      prisma.resetPrismaCalls()
      await assert.rejects(
        () => page(),
        (error: unknown) => {
          const digest = (error as { digest?: unknown } | null)?.digest
          return typeof digest === 'string' && digest.includes('NEXT_REDIRECT;replace;/login;')
        }
      )
      assert.deepEqual(prisma.getPrismaCalls(), [])
    }
  }
})

test('login, logout, click, and the public homepage remain public', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const [login, logout, click, home, proxyModule, headers] = await Promise.all([
    import('../src/app/api/auth/login/route'),
    import('../src/app/api/auth/logout/route'),
    import('../src/app/click/[id]/route'),
    import('../src/app/page'),
    import('../src/proxy'),
    import('./fixtures/headers'),
  ])

  headers.setSessionToken(undefined)

  const loginResponse = await login.POST(request('/api/auth/login', { method: 'POST', body: {} }))
  assert.equal(loginResponse.status, 200)
  assert.equal((await loginResponse.json()).code, -2000)

  const logoutResponse = await logout.POST()
  assert.equal(logoutResponse.status, 200)
  assert.equal((await logoutResponse.json()).code, 0)

  const clickResponse = await click.GET(
    request('/click/1'),
    { params: Promise.resolve({ id: '1' }) }
  )
  assert.equal(clickResponse.status, 307)
  assert.equal(clickResponse.headers.get('location'), 'https://example.com/')

  assert.ok(await home.default())

  for (const path of ['/', '/login', '/click/1', '/api/auth/login', '/api/auth/logout']) {
    const response = proxyModule.default(request(path))
    assert.equal(response.status, 200, path)
    assert.equal(response.headers.get('x-middleware-next'), '1', path)
  }
})
