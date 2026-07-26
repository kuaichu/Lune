import { prisma } from '@/lib/prisma'
import { requireAdminPageSession } from '@/lib/auth-server'
import { CategoriesClient } from './CategoriesClient'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  await requireAdminPageSession()

  const categories = await prisma.category.findMany({
    orderBy: { weight: 'desc' },
    include: {
      _count: { select: { links: true } },
    },
  })

  return <CategoriesClient initialCategories={categories} />
}
