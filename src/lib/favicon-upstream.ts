import { createHash } from 'node:crypto'

const UPSTREAM = 'https://favicon.png.pub/v1/'

// The upstream answers 200 with this same placeholder globe for every site it cannot resolve.
const DEFAULT_FAVICON_SHA256 = '2e30ff33270fd8687b0eb4d12652bfd967f23975f158bf8da93bece2ba4ab947'

export function upstreamFaviconUrl(origin: string): string {
  return UPSTREAM + Buffer.from(origin).toString('base64')
}

export function isDefaultFavicon(bytes: Uint8Array): boolean {
  return createHash('sha256').update(bytes).digest('hex') === DEFAULT_FAVICON_SHA256
}
