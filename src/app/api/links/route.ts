import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateLinkCategory } from '@/lib/category-domain'
import { requireAdminApiSession } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminApiSession(request)
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('categoryId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const where = categoryId ? { categoryId: parseInt(categoryId) } : {}

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      where,
      orderBy: { weight: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { category: { select: { name: true } } },
    }),
    prisma.link.count({ where }),
  ])

  return NextResponse.json({ code: 0, data: links, total, page, limit })
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminApiSession(request)
  if (unauthorized) return unauthorized

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: -2000, err_msg: '请求内容必须是 JSON 对象' }, { status: 400 })
  }
  const { title, url, categoryId, description, weight, property, urlStandby, fontIcon } = body

  if (typeof title !== 'string' || !title.trim() || typeof url !== 'string' || !url.trim()) {
    return NextResponse.json({ code: -2000, err_msg: '标题和链接不能为空！' }, { status: 400 })
  }

  const categoryValidation = await validateLinkCategory({
    mode: 'create',
    categoryIdProvided: Object.prototype.hasOwnProperty.call(body, 'categoryId'),
    categoryId,
    loadCategory: (id) => prisma.category.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    }),
  })
  if (!categoryValidation.ok || categoryValidation.categoryId === undefined) {
    return NextResponse.json(
      { code: -2000, err_msg: categoryValidation.ok ? '必须选择分类' : categoryValidation.error },
      { status: 400 }
    )
  }

  const link = await prisma.link.create({
    data: {
      title: title.trim(),
      url: url.trim(),
      categoryId: categoryValidation.categoryId,
      description: description || '',
      weight: weight || 0,
      property: property || 0,
      urlStandby: urlStandby || '',
      fontIcon: fontIcon || '',
      addTime: Math.floor(Date.now() / 1000),
    },
  })

  return NextResponse.json({ code: 0, id: link.id })
}
