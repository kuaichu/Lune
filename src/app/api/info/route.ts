import { getCurrentSession } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  if (!(await getCurrentSession())) {
    return Response.json({ code: -1, err_msg: '未登录' }, { status: 401 })
  }

  const [catNum, linkNum] = await Promise.all([
    prisma.category.count(),
    prisma.link.count(),
  ])

  return Response.json({
    code: 0,
    data: { cat_num: catNum, link_num: linkNum },
  })
}
