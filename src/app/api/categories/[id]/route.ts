import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateCategoryParentChange } from '@/lib/category-domain'
import { requireAdminApiSession } from '@/lib/auth-server'

function parseId(value: string) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/** 领域规则冲突：目标分类下存在超出两级上限的孙分类。 */
class CategorySubtreeTooDeepError extends Error {
  constructor() {
    super('CATEGORY_SUBTREE_TOO_DEEP')
    this.name = 'CategorySubtreeTooDeepError'
  }
}

/**
 * 读取 Prisma 已知请求错误的稳定错误码，不依赖 message 文本。
 * 非 Prisma 异常返回 undefined，交由调用方重新抛出。
 */
function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined
  }
  const { code } = error as { code: unknown }
  return typeof code === 'string' ? code : undefined
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

  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ code: -1, err_msg: '分类不存在' }, { status: 404 })
  }

  try {
    // 删除分类等于删除它的完整直接子树，四个写操作必须同时成功或同时回滚。
    await prisma.$transaction(async (tx) => {
      const children = await tx.category.findMany({
        where: { parentId: id },
        select: { id: true },
      })
      const childIds = children.map((child) => child.id)

      if (childIds.length > 0) {
        const grandchildren = await tx.category.count({ where: { parentId: { in: childIds } } })
        if (grandchildren > 0) {
          throw new CategorySubtreeTooDeepError()
        }
        await tx.link.deleteMany({ where: { categoryId: { in: childIds } } })
      }

      await tx.link.deleteMany({ where: { categoryId: id } })

      if (childIds.length > 0) {
        await tx.category.deleteMany({ where: { id: { in: childIds } } })
      }

      await tx.category.delete({ where: { id } })
    })
  } catch (error) {
    // 领域冲突与外键约束冲突是可预期的业务冲突。
    if (error instanceof CategorySubtreeTooDeepError || prismaErrorCode(error) === 'P2003') {
      return NextResponse.json(
        { code: -1, err_msg: '分类删除失败，请先处理其下的关联数据' },
        { status: 409 }
      )
    }
    // 存在性检查之后目标被删除：记录已不存在。
    if (prismaErrorCode(error) === 'P2025') {
      return NextResponse.json({ code: -1, err_msg: '分类不存在' }, { status: 404 })
    }
    // 断连、事务超时、程序错误等未知异常不得伪装成业务冲突，交由 Next.js 处理。
    throw error
  }

  return NextResponse.json({ code: 0 })
}
