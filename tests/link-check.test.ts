import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LinkCheckStatus,
  checkUrl,
  classifyHttpResponse,
  describeFetchError,
  mapWithConcurrency,
} from '../src/lib/link-check'

function fakeFetch(status: number, headers: Record<string, string> = {}): typeof fetch {
  return (async () => new Response(null, { status, headers })) as typeof fetch
}

function failingFetch(error: unknown): typeof fetch {
  return (async () => {
    throw error
  }) as typeof fetch
}

test('2xx and 3xx responses are healthy', () => {
  assert.equal(classifyHttpResponse(200, null).status, LinkCheckStatus.Ok)
  assert.equal(classifyHttpResponse(301, 'nginx').status, LinkCheckStatus.Ok)
})

test('404, 410 and 5xx from ordinary servers are broken', () => {
  for (const code of [404, 410, 500, 502]) {
    assert.deepEqual(classifyHttpResponse(code, 'nginx'), { status: LinkCheckStatus.Broken, detail: `HTTP ${code}` })
  }
})

test('challenge statuses behind WAF or CDN protection are unknown, not broken', () => {
  assert.equal(classifyHttpResponse(503, 'cloudflare').status, LinkCheckStatus.Unknown)
  assert.equal(classifyHttpResponse(403, 'AkamaiGHost').status, LinkCheckStatus.Unknown)
})

test('real errors relayed by a protection layer are still broken', () => {
  // 404 from the site itself, 523 = Cloudflare cannot reach the origin.
  assert.deepEqual(classifyHttpResponse(404, 'cloudflare'), { status: LinkCheckStatus.Broken, detail: 'HTTP 404（经 cloudflare）' })
  assert.equal(classifyHttpResponse(523, 'cloudflare').status, LinkCheckStatus.Broken)
})

test('401, 403 and 429 are unknown because sites often refuse bots', () => {
  for (const code of [401, 403, 429]) {
    assert.equal(classifyHttpResponse(code, 'nginx').status, LinkCheckStatus.Unknown)
  }
})

test('checkUrl reports invalid and non-HTTP URLs without fetching', async () => {
  const neverCalled = (async () => assert.fail('fetch should not be called')) as typeof fetch
  assert.equal((await checkUrl('not a url', { fetchImpl: neverCalled })).status, LinkCheckStatus.Broken)
  assert.equal((await checkUrl('ftp://example.com', { fetchImpl: neverCalled })).status, LinkCheckStatus.Unknown)
})

test('checkUrl classifies the fetched response', async () => {
  assert.equal((await checkUrl(' https://example.com ', { fetchImpl: fakeFetch(200) })).status, LinkCheckStatus.Ok)
  assert.equal((await checkUrl('https://example.com', { fetchImpl: fakeFetch(404) })).status, LinkCheckStatus.Broken)
  assert.equal(
    (await checkUrl('https://example.com', { fetchImpl: fakeFetch(403, { server: 'cloudflare' }) })).status,
    LinkCheckStatus.Unknown
  )
})

test('network failures are broken with a readable reason', async () => {
  const dns = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } })
  assert.deepEqual(await checkUrl('https://nope.invalid', { fetchImpl: failingFetch(dns) }), {
    status: LinkCheckStatus.Broken,
    detail: '域名无法解析',
  })
  const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' })
  assert.equal(describeFetchError(timeout), '请求超时')
  assert.equal(describeFetchError({ cause: { code: 'CERT_HAS_EXPIRED' } }), '证书错误')
  assert.equal(describeFetchError(new Error('boom')), '无法连接')
})

test('mapWithConcurrency keeps order and respects the limit', async () => {
  let running = 0
  let peak = 0
  const results = await mapWithConcurrency([5, 1, 4, 2, 3], 2, async (n) => {
    running++
    peak = Math.max(peak, running)
    await new Promise((resolve) => setTimeout(resolve, n))
    running--
    return n * 10
  })
  assert.deepEqual(results, [50, 10, 40, 20, 30])
  assert.equal(peak, 2)
})
