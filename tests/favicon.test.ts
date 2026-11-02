import assert from 'node:assert/strict'
import test from 'node:test'

import { iconFallback, parseIconOrigin, siteIconSrc, siteOrigin } from '../src/lib/favicon'
import { isDefaultFavicon, upstreamFaviconUrl } from '../src/lib/favicon-upstream'

test('siteOrigin keeps protocol, host and non-default port only', () => {
  assert.equal(siteOrigin('https://www.example.com/a/b?c=1#d'), 'https://www.example.com')
  assert.equal(siteOrigin('http://192.168.1.2:8080/x'), 'http://192.168.1.2:8080')
  assert.equal(siteOrigin('https://example.com:443/'), 'https://example.com')
})

test('siteOrigin rejects non-http URLs, credentials and garbage', () => {
  assert.equal(siteOrigin('javascript:alert(1)'), null)
  assert.equal(siteOrigin('ftp://example.com'), null)
  assert.equal(siteOrigin('https://user:pass@example.com'), null)
  assert.equal(siteOrigin('not a url'), null)
})

test('siteIconSrc points at the local site-icon route with an encoded origin', () => {
  assert.equal(
    siteIconSrc('https://example.com/page'),
    '/site-icon?u=https%3A%2F%2Fexample.com'
  )
  assert.equal(siteIconSrc('mailto:a@b.c'), null)
})

test('parseIconOrigin only accepts bare origins', () => {
  assert.equal(parseIconOrigin('https://example.com'), 'https://example.com')
  assert.equal(parseIconOrigin('https://example.com/'), 'https://example.com')
  assert.equal(parseIconOrigin('https://example.com/path'), null)
  assert.equal(parseIconOrigin('https://example.com?x=1'), null)
  assert.equal(parseIconOrigin(null), null)
  assert.equal(parseIconOrigin(`https://${'a'.repeat(400)}.com`), null)
})

test('iconFallback uses the first title character and a stable color per host', () => {
  const first = iconFallback('mioBT', 'https://www.miobt.com/a')
  const second = iconFallback('Other title', 'https://miobt.com/b')
  assert.equal(first.letter, 'M')
  assert.equal(first.color, second.color)
  assert.equal(iconFallback('番剧', 'https://example.com').letter, '番')
  assert.equal(iconFallback('  ', 'https://example.com').letter, 'E')
})

test('upstreamFaviconUrl base64-encodes the origin', () => {
  assert.equal(
    upstreamFaviconUrl('https://github.com'),
    'https://favicon.png.pub/v1/aHR0cHM6Ly9naXRodWIuY29t'
  )
})

test('isDefaultFavicon only matches the upstream placeholder bytes', () => {
  assert.equal(isDefaultFavicon(new Uint8Array([1, 2, 3])), false)
  assert.equal(isDefaultFavicon(new Uint8Array(0)), false)
})
