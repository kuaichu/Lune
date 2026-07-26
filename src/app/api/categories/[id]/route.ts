import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateCategoryParentChange } from '@/lib/category-domain'
import { requireAdminApiSession } from '@/lib/auth-server'

function parseId(value: string) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdminApiSession(request)
  if (unauthorized) return unauthorized

  const { id: idStr } = await params
  const id = parseId(idStr)
  if (id === null) {
    return NextResponse.json({ code: -2000, err_msg: '分类 ID 无效' }, { status: 400 })
  }
  const category = await prisma.category.findUnique({ where: { id } })
  if (!category) {
    return NextResponse.json({ code: -1, err_msg: '分类不存在' }, { status: 404 })
  }
  return NextResponse.json({ code: 0, data: category })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdminApiSession(request)
  if (unauthorized) return unauthorized

  const { id: idStr } = await params
  const id = parseId(idStr)
  if (id === null) {
    return NextResponse.json({ code: -2000, err_msg: '分类 ID 无效' }, { status: 400 })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: -2000, err_msg: '请求内容必须是 JSON 对象' }, { status: 400 })
  }
  const { name, parentId, property, weight, description, fontIcon } = body

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ code: -2000, err_msg: '分类名称不能为空！' }, { status: 400 })
  }

  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true, parentId: true },
  })
  if (!existing) {
    return NextResponse.json({ code: -1, err_msg: '分类不存在' }, { status: 404 })
  }

  const parentValidation = await validateCategoryParentChange({
    mode: 'update',
    categoryId: id,
    currentParentId: existing.parentId,
    parentIdProvided: Object.prototype.hasOwnProperty.call(body, 'parentId'),
    parentId,
    loadCategory: (categoryId) => prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, parentId: true },
    }),
    hasChildren: async (categoryId) => (await prisma.category.count({ where: { parentId: categoryId } })) > 0,
  })
  if (!parentValidation.ok) {
    return NextResponse.json({ code: -2000, err_msg: parentValidation.error }, { status: 400 })
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: name.trim(),
      ...(parentValidation.parentId !== undefined ? { parentId: parentValidation.parentId } : {}),
      property: property ?? 0,
      weight: weight ?? 0,
      description: description || '',
      fontIcon: fontIcon || '',
      upTime: Math.floor(Date.now() / 1000),
    },
  })

  return NextResponse.json({ code: 0, data: category })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdminApiSession(request)
  if (unauthorized) return unauthorized

  const { id: idStr } = await params
  const id = parseId(idStr)
  if (id === null) {
    return NextResponse.json({ code: -2000, err_msg: '分类 ID 无效' }, { status: 400 })
  }

  await prisma.link.deleteMany({ where: { categoryId: id } })
  await prisma.category.deleteMany({ where: { parentId: id } })
  await prisma.category.delete({ where: { id } })

  return NextResponse.json({ code: 0 })
}
