import { ICON_COLORS } from './icons'

export const SITE_ICON_PATH = '/site-icon'

/** Reduce a link URL to its `protocol//host[:port]` origin, or null if it is not a plain http(s) URL. */
export function siteOrigin(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (parsed.username || parsed.password || !parsed.hostname) return null
    return parsed.origin
  } catch {
    return null
  }
}

/** Validate the `u` query value of the site-icon route and return a normalized origin. */
export function parseIconOrigin(value: string | null): string | null {
  if (!value || value.length > 300) return null
  const origin = siteOrigin(value)
  if (!origin) return null
  // Only a bare origin is accepted; paths and queries would make the route an open proxy key.
  return value === origin || value === `${origin}/` ? origin : null
}

export function siteIconSrc(url: string): string | null {
  const origin = siteOrigin(url)
  return origin ? `${SITE_ICON_PATH}?u=${encodeURIComponent(origin)}` : null
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

/** Letter and accent color for the avatar shown when a site has no usable favicon. */
export function iconFallback(title: string, url: string): { letter: string; color: string } {
  const origin = siteOrigin(url)
  const host = origin ? new URL(origin).hostname.replace(/^www\./, '') : url
  const letter = Array.from(title.trim())[0] ?? Array.from(host)[0] ?? '?'
  return {
    letter: letter.toUpperCase(),
    color: ICON_COLORS[hashString(host) % ICON_COLORS.length],
  }
}
