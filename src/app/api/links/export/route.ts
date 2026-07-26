import { type NextRequest } from 'next/server'

import { requireAdminApiSession } from '@/lib/auth-server'
import { generateBookmarkHtml } from '@/lib/bookmark-export'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const NO_STORE = 'private, no-store'

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminApiSession(request)
  if (unauthorized) return unauthorized

  try {
    const [categories, links] = await Promise.all([
      prisma.category.findMany({
        select: { id: true, name: true, parentId: true, weight: true, addTime: true },
      }),
      prisma.link.findMany({
        select: {
          id: true,
          categoryId: true,
          title: true,
          url: true,
          description: true,
          weight: true,
          addTime: true,
        },
      }),
    ])

    return new Response(generateBookmarkHtml(categories, links), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="lune-bookmarks.html"',
        'Cache-Control': NO_STORE,
      },
    })
  } catch {
    return new Response('导出失败', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': NO_STORE,
      },
    })
  }
}
