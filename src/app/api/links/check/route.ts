import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApiSession } from '@/lib/auth-server'
import { checkUrl, mapWithConcurrency } from '@/lib/link-check'

export const dynamic = 'force-dynamic'

// The admin page sends small batches so each request stays well under proxy timeouts.
const MAX_IDS_PER_REQUEST = 50
const CONCURRENCY = 8

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminApiSession(request)
  if (unauthorized) return unauthorized

  const body = await request.json().catch(() => null)
  const ids: unknown = body?.ids
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_IDS_PER_REQUEST ||
    !ids.every((id) => Number.isSafeInteger(id) && id > 0)
  ) {
    return NextResponse.json(
      { code: -2000, err_msg: `ids 必须是 1 到 ${MAX_IDS_PER_REQUEST} 个链接 ID` },
      { status: 400 }
    )
  }

  const links = await prisma.link.findMany({
    where: { id: { in: ids as number[] } },
    select: { id: true, url: true },
  })

  const results = await mapWithConcurrency(links, CONCURRENCY, async (link) => {
    const result = await checkUrl(link.url)
    const lastCheckedTime = new Date().toISOString()
    // Skip the write if the link was deleted or its URL edited while the check was running.
    await prisma.link.updateMany({
      where: { id: link.id, url: link.url },
      data: { checkStatus: result.status, lastCheckedTime },
    })
    return { id: link.id, checkStatus: result.status, lastCheckedTime, detail: result.detail }
  })

  return NextResponse.json({ code: 0, data: results })
}
