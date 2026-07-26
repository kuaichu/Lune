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
  const [categories, category, links, link, exportLinks, settings, info] = await Promise.all([
    import('../src/app/api/categories/route'),
    import('../src/app/api/categories/[id]/route'),
    import('../src/app/api/links/route'),
    import('../src/app/api/links/[id]/route'),
    import('../src/app/api/links/export/route'),
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
        ['GET /api/links/export', () => exportLinks.GET(request('/api/links/export', { token }))],
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

test('a valid session exports every bookmark with download headers and no internal data', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  const links = Array.from({ length: 1002 }, (_, index) => ({
    id: index + 1,
    categoryId: index === 1 ? 2 : 1,
    title: index === 1 ? 'Private bookmark' : `Bookmark ${index + 1}`,
    url: `https://example.com/bookmarks/${index + 1}`,
    description: index === 0 ? 'First bookmark' : '',
    weight: 0,
    property: index === 1 ? 1 : 0,
    addTime: 1_700_000_000 + index,
  }))

  prisma.installPrismaStore({
    categories: [
      { id: 1, name: 'Root folder', parentId: null, weight: 10, addTime: 1_700_000_000 },
      { id: 2, name: 'Private child', parentId: 1, weight: 5, addTime: 1_700_000_001, property: 1 },
    ],
    links,
  })
  prisma.resetPrismaCalls()

  try {
    const exportRoute = await import('../src/app/api/links/export/route')
    const response = await exportRoute.GET(
      request('/api/links/export', { token: createSessionToken('admin') })
    )

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8')
    assert.equal(
      response.headers.get('content-disposition'),
      'attachment; filename="lune-bookmarks.html"'
    )
    assert.equal(response.headers.get('cache-control'), 'private, no-store')

    const html = await response.text()
    assert.match(html, />Bookmark 1<\/A>/)
    assert.match(html, />Bookmark 1002<\/A>/, 'the export must not stop at 1000 links')
    assert.match(html, />Private bookmark<\/A>/, 'admin backups include private links')
    assert.doesNotMatch(html, /onenav\.db|DATABASE_URL|endpoint-auth-test-secret|Error:|at GET \(/i)
    assert.deepEqual(prisma.getPrismaCalls(), ['category.findMany', 'link.findMany'])
  } finally {
    prisma.uninstallPrismaStore()
  }
})

test('an empty database exports a valid empty bookmark file', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore({ categories: [], links: [] })

  try {
    const exportRoute = await import('../src/app/api/links/export/route')
    const response = await exportRoute.GET(
      request('/api/links/export', { token: createSessionToken('admin') })
    )
    const html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /^<!DOCTYPE NETSCAPE-Bookmark-file-1>/)
    assert.match(html, /<DL><p>\n<\/DL><p>\n$/)
  } finally {
    prisma.uninstallPrismaStore()
  }
})

test('bookmark export failures do not disclose paths, secrets, or stacks', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore({ categories: [], links: [] })
  prisma.setPrismaStoreHooks({
    beforeOperation(operation) {
      if (operation === 'category.findMany') {
        throw new Error(`S:\\private\\onenav.db DATABASE_URL AUTH_SECRET ${TEST_SECRET}`)
      }
    },
  })

  try {
    const exportRoute = await import('../src/app/api/links/export/route')
    const response = await exportRoute.GET(
      request('/api/links/export', { token: createSessionToken('admin') })
    )
    const body = await response.text()

    assert.equal(response.status, 500)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
    assert.doesNotMatch(body, /onenav\.db|DATABASE_URL|AUTH_SECRET|endpoint-auth-test-secret|Error:|\\private/i)
  } finally {
    prisma.uninstallPrismaStore()
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

test('the anonymous homepage never serializes private categories or links', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const [home, headers, prisma] = await Promise.all([
    import('../src/app/page'),
    import('./fixtures/headers'),
    import('./fixtures/prisma'),
  ])
  headers.setSessionToken(undefined)
  prisma.installPrismaStore({
    categories: [
      { id: 1, name: 'Public root', parentId: null, property: 0, fontIcon: '' },
      { id: 2, name: 'Private root', parentId: null, property: 1, fontIcon: '' },
    ],
    links: [
      { id: 10, categoryId: 1, title: 'Public link', url: 'https://public.example', description: '', property: 0 },
      { id: 11, categoryId: 1, title: 'Private link', url: 'https://private.example', description: '', property: 1 },
      { id: 12, categoryId: 2, title: 'Hidden category link', url: 'https://hidden.example', description: '', property: 0 },
    ],
  })

  try {
    const rendered = await home.default()
    const homepageProps = (rendered as unknown as {
      props: { categories: Array<{ id: number; links: Array<{ id: number }> }> }
    }).props

    assert.deepEqual(homepageProps.categories.map((category) => category.id), [1])
    assert.deepEqual(homepageProps.categories[0].links.map((link) => link.id), [10])
    assert.doesNotMatch(JSON.stringify(homepageProps.categories), /Private link|private\.example|Private root/)
  } finally {
    prisma.uninstallPrismaStore()
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/categories/[id] data integrity.
//
// Deleting a category means deleting its complete direct subtree. Before the
// fix the handler ran three unsynchronised writes, so a foreign-key failure on
// the child-category step left the parent's links already deleted (a half
// delete) and surfaced as an uncaught 500. These tests assert on committed data
// state, not on which mocks were called.
// ---------------------------------------------------------------------------

/**
 * Two roots. Root 1 owns links and two children; the children own links too.
 * Root 4 and its subtree are the untouched control group.
 */
const DELETE_FIXTURE = {
  categories: [
    { id: 1, name: 'Parent', parentId: null },
    { id: 2, name: 'Child A', parentId: 1 },
    { id: 3, name: 'Child B', parentId: 1 },
    { id: 4, name: 'Other root', parentId: null },
    { id: 5, name: 'Other child', parentId: 4 },
  ],
  links: [
    { id: 10, categoryId: 1, title: 'parent link' },
    { id: 11, categoryId: 2, title: 'child A link' },
    { id: 12, categoryId: 3, title: 'child B link' },
    { id: 13, categoryId: 4, title: 'other root link' },
    { id: 14, categoryId: 5, title: 'other child link' },
  ],
}

async function deleteCategory(id: string, token?: string) {
  const { DELETE } = await import('../src/app/api/categories/[id]/route')
  return DELETE(
    request(`/api/categories/${id}`, { method: 'DELETE', token }),
    { params: Promise.resolve({ id }) }
  )
}

const ids = <T extends { id: number }>(rows: T[]) => rows.map((row) => row.id).sort((a, b) => a - b)

test('deleting a parent removes its links, child links, children, and itself in one transaction', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore(DELETE_FIXTURE)

  try {
    const response = await deleteCategory('1', createSessionToken('admin'))

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { code: 0 })

    const after = prisma.readPrismaStore()
    assert.deepEqual(ids(after.categories), [4, 5], 'parent and both children are gone')
    assert.deepEqual(ids(after.links), [13, 14], 'parent and child links are gone')
  } finally {
    prisma.uninstallPrismaStore()
  }
})

test('deleting a leaf category removes only that category and its links', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore(DELETE_FIXTURE)

  try {
    const response = await deleteCategory('5', createSessionToken('admin'))

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { code: 0 })

    const after = prisma.readPrismaStore()
    assert.deepEqual(ids(after.categories), [1, 2, 3, 4])
    assert.deepEqual(ids(after.links), [10, 11, 12, 13])
  } finally {
    prisma.uninstallPrismaStore()
  }
})

test('a failure after link deletion rolls the whole delete back and returns 409', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore(DELETE_FIXTURE)
  const before = prisma.readPrismaStore()

  try {
    // Fail at the category-deletion stage, i.e. strictly after at least one
    // link deleteMany has already run inside the transaction.
    let linkDeletes = 0
    prisma.setPrismaStoreHooks({
      beforeOperation(operation) {
        if (operation === 'link.deleteMany') linkDeletes += 1
        if (operation === 'category.deleteMany') {
          assert.ok(linkDeletes > 0, 'links must already have been deleted when the failure hits')
          throw new prisma.StoreForeignKeyViolation('injected storage failure')
        }
      },
    })

    const response = await deleteCategory('1', createSessionToken('admin'))

    assert.equal(response.status, 409)
    const body = await response.json()
    assert.equal(body.code, -1)
    assert.equal(typeof body.err_msg, 'string')
    assert.ok(!/injected storage failure|prisma|sql|\\|\//i.test(body.err_msg), 'no internals leak')

    prisma.setPrismaStoreHooks({})
    const after = prisma.readPrismaStore()
    assert.deepEqual(after.categories, before.categories, 'no category was left deleted')
    assert.deepEqual(after.links, before.links, 'no link was left deleted')
  } finally {
    prisma.setPrismaStoreHooks({})
    prisma.uninstallPrismaStore()
  }
})

test('an unexpected third category level is rejected with 409 and changes nothing', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore({
    categories: [
      ...DELETE_FIXTURE.categories,
      { id: 6, name: 'Grandchild', parentId: 2 },
    ],
    links: [...DELETE_FIXTURE.links, { id: 15, categoryId: 6, title: 'grandchild link' }],
  })
  const before = prisma.readPrismaStore()

  try {
    const response = await deleteCategory('1', createSessionToken('admin'))

    assert.equal(response.status, 409)
    assert.equal((await response.json()).code, -1)

    const after = prisma.readPrismaStore()
    assert.deepEqual(after.categories, before.categories)
    assert.deepEqual(after.links, before.links)
  } finally {
    prisma.uninstallPrismaStore()
  }
})

test('a foreign-key violation raised inside the transaction rolls back and returns 409', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore(DELETE_FIXTURE)
  const before = prisma.readPrismaStore()

  try {
    // Attach a link to a child inside the transaction, right before the children
    // are deleted, so the store's Restrict enforcement fires exactly like the
    // database would. This injects a constraint conflict within the single
    // transaction; it does not model a second connection writing concurrently.
    prisma.setPrismaStoreHooks({
      beforeOperation(operation, state) {
        if (operation === 'category.deleteMany') {
          state.links.push({ id: 99, categoryId: 2, title: 'in-transaction injected link' })
        }
      },
    })

    const response = await deleteCategory('1', createSessionToken('admin'))

    assert.equal(response.status, 409)
    assert.equal((await response.json()).code, -1)

    prisma.setPrismaStoreHooks({})
    const after = prisma.readPrismaStore()
    assert.deepEqual(after.categories, before.categories)
    assert.deepEqual(after.links, before.links, 'the rollback also discards the injected link')
  } finally {
    prisma.setPrismaStoreHooks({})
    prisma.uninstallPrismaStore()
  }
})

/**
 * Injects `thrown` at the category-deletion stage, i.e. strictly after at least
 * one link.deleteMany has already run inside the transaction, and returns the
 * handler outcome plus the committed state for rollback assertions.
 */
async function injectAfterLinkDeletion(
  prisma: typeof import('./fixtures/prisma'),
  thrown: unknown
) {
  let linkDeletes = 0
  prisma.setPrismaStoreHooks({
    beforeOperation(operation) {
      if (operation === 'link.deleteMany') linkDeletes += 1
      if (operation === 'category.deleteMany') {
        assert.ok(linkDeletes > 0, 'links must already have been deleted when the failure hits')
        throw thrown
      }
    },
  })

  const outcome = await deleteCategory('1', createSessionToken('admin')).then(
    (response) => ({ response, rejection: undefined }),
    (rejection: unknown) => ({ response: undefined, rejection })
  )

  prisma.setPrismaStoreHooks({})
  return outcome
}

test('a P2003 raised after link deletion returns 409 and rolls the delete back', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore(DELETE_FIXTURE)
  const before = prisma.readPrismaStore()

  try {
    const { response, rejection } = await injectAfterLinkDeletion(
      prisma,
      new prisma.StoreForeignKeyViolation('FOREIGN KEY constraint failed on on_links.fid')
    )

    assert.equal(rejection, undefined, 'an expected constraint conflict must not escape')
    assert.equal(response?.status, 409)
    const body = await response!.json()
    assert.equal(body.code, -1)
    assert.ok(
      !/FOREIGN KEY|on_links|P2003|prisma|sql|\\|\//i.test(body.err_msg),
      'no exception text, SQL, or path leaks'
    )

    const after = prisma.readPrismaStore()
    assert.deepEqual(after.categories, before.categories, 'parent and children survive')
    assert.deepEqual(after.links, before.links, 'parent and child links survive')
  } finally {
    prisma.setPrismaStoreHooks({})
    prisma.uninstallPrismaStore()
  }
})

test('an unknown error after link deletion is rethrown instead of masked as 409', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore(DELETE_FIXTURE)
  const before = prisma.readPrismaStore()

  try {
    // Stands in for a dropped connection, a transaction timeout, or a plain bug.
    const infrastructureFailure = new Error('connection terminated unexpectedly')
    const { response, rejection } = await injectAfterLinkDeletion(prisma, infrastructureFailure)

    assert.equal(response, undefined, 'the handler must not answer with a Response')
    assert.equal(rejection, infrastructureFailure, 'the original error is rethrown unchanged')

    const after = prisma.readPrismaStore()
    assert.deepEqual(after.categories, before.categories, 'rollback still applies')
    assert.deepEqual(after.links, before.links, 'rollback still applies')
  } finally {
    prisma.setPrismaStoreHooks({})
    prisma.uninstallPrismaStore()
  }
})

test('a P2025 raised inside the transaction returns 404 and changes nothing', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore(DELETE_FIXTURE)
  const before = prisma.readPrismaStore()

  try {
    // The target disappears between the existence check and the final delete.
    const { response, rejection } = await injectAfterLinkDeletion(
      prisma,
      new prisma.StoreRecordNotFound('record to delete does not exist')
    )

    assert.equal(rejection, undefined)
    assert.equal(response?.status, 404)
    const body = await response!.json()
    assert.equal(body.code, -1)
    assert.ok(!/P2025|record to delete|prisma|sql|\\|\//i.test(body.err_msg), 'no internals leak')

    const after = prisma.readPrismaStore()
    assert.deepEqual(after.categories, before.categories)
    assert.deepEqual(after.links, before.links)
  } finally {
    prisma.setPrismaStoreHooks({})
    prisma.uninstallPrismaStore()
  }
})

test('deleting a category that does not exist returns 404 and changes nothing', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore(DELETE_FIXTURE)
  const before = prisma.readPrismaStore()

  try {
    const response = await deleteCategory('9999', createSessionToken('admin'))

    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), { code: -1, err_msg: '分类不存在' })

    const after = prisma.readPrismaStore()
    assert.deepEqual(after.categories, before.categories)
    assert.deepEqual(after.links, before.links)
  } finally {
    prisma.uninstallPrismaStore()
  }
})

test('malformed category IDs are rejected with 400 before any data access', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore(DELETE_FIXTURE)
  const before = prisma.readPrismaStore()

  try {
    for (const id of [
      '0',
      '-1',
      '1.5',
      'abc',
      '',
      ' ',
      'NaN',
      'Infinity',
      '9007199254740993',
      '1e400',
    ]) {
      prisma.resetPrismaCalls()
      const response = await deleteCategory(id, createSessionToken('admin'))

      assert.equal(response.status, 400, `id=${JSON.stringify(id)}`)
      assert.deepEqual(
        await response.json(),
        { code: -2000, err_msg: '分类 ID 无效' },
        `id=${JSON.stringify(id)}`
      )
      assert.deepEqual(prisma.getPrismaCalls(), [], `id=${JSON.stringify(id)} touched data`)
    }

    const after = prisma.readPrismaStore()
    assert.deepEqual(after.categories, before.categories)
    assert.deepEqual(after.links, before.links)
  } finally {
    prisma.uninstallPrismaStore()
  }
})

test('unauthenticated deletes return 401 without reaching the delete transaction', async () => {
  process.env.AUTH_SECRET = TEST_SECRET
  const prisma = await import('./fixtures/prisma')
  prisma.installPrismaStore(DELETE_FIXTURE)
  const before = prisma.readPrismaStore()

  try {
    for (const token of [
      undefined,
      'forged.token',
      createSessionToken('admin', Date.now() - (SESSION_TTL_SECONDS + 60) * 1000),
    ]) {
      prisma.resetPrismaCalls()
      const response = await deleteCategory('1', token)

      assert.equal(response.status, 401)
      assert.deepEqual(await response.json(), { code: -1, err_msg: '未登录' })
      assert.deepEqual(prisma.getPrismaCalls(), [], 'no Prisma operation may run')
    }

    const after = prisma.readPrismaStore()
    assert.deepEqual(after.categories, before.categories)
    assert.deepEqual(after.links, before.links)

    // A valid session does reach the transaction and commits.
    prisma.resetPrismaCalls()
    const allowed = await deleteCategory('1', createSessionToken('admin'))
    assert.equal(allowed.status, 200)
    assert.ok(prisma.getPrismaCalls().includes('$transaction'))
    assert.deepEqual(ids(prisma.readPrismaStore().categories), [4, 5])
  } finally {
    prisma.uninstallPrismaStore()
  }
})
