import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth'
import { canAccessLink } from '@/lib/category-visibility'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = Number(idStr)

  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const link = await prisma.link.findUnique({
    where: { id },
    select: {
      url: true,
      property: true,
      categoryId: true,
    },
  })

  if (!link) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)
  const canAccess = await canAccessLink({
    isAuthenticated: Boolean(session),
    linkProperty: link.property,
    categoryId: link.categoryId,
    loadCategory: (categoryId) =>
      prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, parentId: true, property: true },
      }),
  })

  if (!canAccess) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.redirect(link.url)
}
