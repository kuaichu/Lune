import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateCategoryParentChange } from '@/lib/category-domain'

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { weight: 'desc' },
    include: {
      _count: { select: { links: true } },
    },
  })
  return NextResponse.json({ code: 0, data: categories })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: -2000, err_msg: '请求内容必须是 JSON 对象' }, { status: 400 })
  }
  const { name, parentId, property, weight, description, fontIcon } = body

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ code: -2000, err_msg: '分类名称不能为空！' }, { status: 400 })
  }

  const parentValidation = await validateCategoryParentChange({
    mode: 'create',
    parentIdProvided: Object.prototype.hasOwnProperty.call(body, 'parentId'),
    parentId,
    loadCategory: (id) => prisma.category.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    }),
    hasChildren: async (id) => (await prisma.category.count({ where: { parentId: id } })) > 0,
  })
  if (!parentValidation.ok || parentValidation.parentId === undefined) {
    return NextResponse.json(
      { code: -2000, err_msg: parentValidation.ok ? '必须明确提供父分类' : parentValidation.error },
      { status: 400 }
    )
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      parentId: parentValidation.parentId,
      property: property || 0,
      weight: weight || 0,
      description: description || '',
      fontIcon: fontIcon || '',
      addTime: Math.floor(Date.now() / 1000),
    },
  })

  return NextResponse.json({ code: 0, id: category.id })
}
