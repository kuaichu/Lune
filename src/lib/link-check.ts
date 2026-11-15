// Link liveness checks. Status codes match the legacy OneNav `check_status` column.
export const LinkCheckStatus = {
  Unchecked: 0,
  Ok: 1,
  Broken: 2,
  // The site answered but probably blocked an automated request (WAF, anti-bot, login wall), or the link is not HTTP.
  Unknown: 3,
} as const

export type LinkCheckStatusValue = (typeof LinkCheckStatus)[keyof typeof LinkCheckStatus]

export type LinkCheckResult = {
  status: LinkCheckStatusValue
  detail: string
}

export const LINK_CHECK_TIMEOUT_MS = 10_000

const PROTECTION_SERVERS = /cloudflare|waf|akamai|starshield|ddos-guard|sucuri/i
// Statuses that usually mean "not for bots" rather than "gone".
const AMBIGUOUS_STATUSES = new Set([401, 403, 429])
// Protection layers also answer bots with 503 challenge pages. Other errors they relay (404, 52x origin down) are real.
const PROTECTION_CHALLENGE_STATUSES = new Set([...AMBIGUOUS_STATUSES, 503])

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

export function classifyHttpResponse(httpStatus: number, server: string | null): LinkCheckResult {
  if (httpStatus < 400) return { status: LinkCheckStatus.Ok, detail: `HTTP ${httpStatus}` }
  const protectedBy = server && PROTECTION_SERVERS.test(server) ? server : null
  if (protectedBy && PROTECTION_CHALLENGE_STATUSES.has(httpStatus)) {
    return { status: LinkCheckStatus.Unknown, detail: `HTTP ${httpStatus}，${protectedBy} 防护拦截` }
  }
  if (AMBIGUOUS_STATUSES.has(httpStatus)) {
    return { status: LinkCheckStatus.Unknown, detail: `HTTP ${httpStatus}，可能拒绝了自动访问` }
  }
  return { status: LinkCheckStatus.Broken, detail: protectedBy ? `HTTP ${httpStatus}（经 ${protectedBy}）` : `HTTP ${httpStatus}` }
}

export function describeFetchError(error: unknown): string {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return '请求超时'
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code
  switch (code) {
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return '域名无法解析'
    case 'ECONNREFUSED':
      return '连接被拒绝'
    case 'ECONNRESET':
      return '连接被重置'
    case 'UND_ERR_CONNECT_TIMEOUT':
      return '连接超时'
    default:
      if (typeof code === 'string' && /CERT|SSL|TLS/.test(code)) return '证书错误'
      return typeof code === 'string' ? `无法连接（${code}）` : '无法连接'
  }
}

export async function checkUrl(
  url: string,
  { fetchImpl = fetch, timeoutMs = LINK_CHECK_TIMEOUT_MS }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<LinkCheckResult> {
  let target: URL
  try {
    target = new URL(url.trim())
  } catch {
    return { status: LinkCheckStatus.Broken, detail: '无效的 URL' }
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return { status: LinkCheckStatus.Unknown, detail: '不是 HTTP 链接，无法检测' }
  }

  try {
    const response = await fetchImpl(target.href, {
      method: 'GET',
      redirect: 'follow',
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    })
    // Only the status matters; don't download the page.
    await response.body?.cancel().catch(() => {})
    return classifyHttpResponse(response.status, response.headers.get('server'))
  } catch (error) {
    return { status: LinkCheckStatus.Broken, detail: describeFetchError(error) }
  }
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function run() {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}
