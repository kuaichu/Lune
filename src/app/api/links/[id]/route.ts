import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateLinkCategory } from '@/lib/category-domain'

function parseId(value: string) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = parseId(idStr)
  if (id === null) {
    return NextResponse.json({ code: -2000, err_msg: '链接 ID 无效' }, { status: 400 })
  }
  const link = await prisma.link.findUnique({ where: { id } })
  if (!link) {
    return NextResponse.json({ code: -1, err_msg: '链接不存在' }, { status: 404 })
  }
  return NextResponse.json({ code: 0, data: link })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = parseId(idStr)
  if (id === null) {
    return NextResponse.json({ code: -2000, err_msg: '链接 ID 无效' }, { status: 400 })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: -2000, err_msg: '请求内容必须是 JSON 对象' }, { status: 400 })
  }
  const { title, url, categoryId, description, weight, property, urlStandby, fontIcon } = body

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ code: -2000, err_msg: '标题不能为空！' }, { status: 400 })
  }

  const existing = await prisma.link.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ code: -1, err_msg: '链接不存在' }, { status: 404 })
  }

  const categoryValidation = await validateLinkCategory({
    mode: 'update',
    categoryIdProvided: Object.prototype.hasOwnProperty.call(body, 'categoryId'),
    categoryId,
    loadCategory: (categoryIdToLoad) => prisma.category.findUnique({
      where: { id: categoryIdToLoad },
      select: { id: true, parentId: true },
    }),
  })
  if (!categoryValidation.ok) {
    return NextResponse.json({ code: -2000, err_msg: categoryValidation.error }, { status: 400 })
  }

  const link = await prisma.link.update({
    where: { id },
    data: {
      title: title.trim(),
      url: url || '',
      ...(categoryValidation.categoryId !== undefined ? { categoryId: categoryValidation.categoryId } : {}),
      description: description || '',
      weight: weight ?? 0,
      property: property ?? 0,
      urlStandby: urlStandby || '',
      fontIcon: fontIcon || '',
      upTime: Math.floor(Date.now() / 1000),
    },
  })

  return NextResponse.json({ code: 0, data: link })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = parseId(idStr)
  if (id === null) {
    return NextResponse.json({ code: -2000, err_msg: '链接 ID 无效' }, { status: 400 })
  }
  await prisma.link.delete({ where: { id } })
  return NextResponse.json({ code: 0 })
}
