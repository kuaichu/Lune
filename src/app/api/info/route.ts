import { type NextRequest } from 'next/server'
import { requireAdminApiSession } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminApiSession(request)
  if (unauthorized) return unauthorized

  const [catNum, linkNum] = await Promise.all([
    prisma.category.count(),
    prisma.link.count(),
  ])

  return Response.json({
    code: 0,
    data: { cat_num: catNum, link_num: linkNum },
  })
}
