import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApiSession } from '@/lib/auth-server'
import { validateLinkCategory } from '@/lib/category-domain'

export const dynamic = 'force-dynamic'

const MAX_IDS = 1000

function badRequest(message: string) {
  return NextResponse.json({ code: -2000, err_msg: message }, { status: 400 })
}

// Bulk edits from the links admin page: { action: 'delete' | 'move' | 'visibility', ids, categoryId?, property? }.
export async function POST(request: NextRequest) {
  const unauthorized = requireAdminApiSession(request)
  if (unauthorized) return unauthorized

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('请求内容必须是 JSON 对象')

  const { action, ids } = body as { action?: unknown; ids?: unknown }
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_IDS ||
    !ids.every((id) => Number.isSafeInteger(id) && id > 0)
  ) {
    return badRequest(`ids 必须是 1 到 ${MAX_IDS} 个链接 ID`)
  }
  const where = { id: { in: ids as number[] } }

  if (action === 'delete') {
    const { count } = await prisma.link.deleteMany({ where })
    return NextResponse.json({ code: 0, count })
  }

  if (action === 'move') {
    const validation = await validateLinkCategory({
      mode: 'create',
      categoryIdProvided: Object.prototype.hasOwnProperty.call(body, 'categoryId'),
      categoryId: (body as { categoryId?: unknown }).categoryId,
      loadCategory: (id) => prisma.category.findUnique({ where: { id }, select: { id: true, parentId: true } }),
    })
    if (!validation.ok) return badRequest(validation.error)
    const { count } = await prisma.link.updateMany({
      where,
      data: { categoryId: validation.categoryId, upTime: Math.floor(Date.now() / 1000) },
    })
    return NextResponse.json({ code: 0, count })
  }

  if (action === 'visibility') {
    const property = (body as { property?: unknown }).property
    if (property !== 0 && property !== 1) return badRequest('property 必须是 0（公开）或 1（私有）')
    const { count } = await prisma.link.updateMany({
      where,
      data: { property, upTime: Math.floor(Date.now() / 1000) },
    })
    return NextResponse.json({ code: 0, count })
  }

  return badRequest('action 必须是 delete、move 或 visibility')
}
