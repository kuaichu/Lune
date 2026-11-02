import { NextRequest, NextResponse } from 'next/server'
import { parseIconOrigin } from '@/lib/favicon'
import { isDefaultFavicon, upstreamFaviconUrl } from '@/lib/favicon-upstream'

const FOUND_CACHE = 'public, max-age=604800, stale-while-revalidate=86400'
const MISSING_CACHE = 'public, max-age=86400'
const ERROR_CACHE = 'public, max-age=300'

// 204 rather than 404 so the browser still fires <img> onError without logging a failed request per icon.
function noIcon(cacheControl: string) {
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': cacheControl } })
}

export async function GET(request: NextRequest) {
  const origin = parseIconOrigin(request.nextUrl.searchParams.get('u'))
  if (!origin) {
    return new NextResponse(null, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(upstreamFaviconUrl(origin), { signal: AbortSignal.timeout(8000) })
  } catch {
    return noIcon(ERROR_CACHE)
  }
  if (!upstream.ok) {
    return noIcon(ERROR_CACHE)
  }

  const body = new Uint8Array(await upstream.arrayBuffer())
  if (body.length === 0 || isDefaultFavicon(body)) {
    return noIcon(MISSING_CACHE)
  }

  const contentType = upstream.headers.get('content-type') ?? ''
  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType.startsWith('image/') ? contentType : 'image/x-icon',
      'Cache-Control': FOUND_CACHE,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  })
}
