import { prisma } from '@/lib/prisma'
import { requireAdminPageSession } from '@/lib/auth-server'
import { LinksClient } from './LinksClient'

export const dynamic = 'force-dynamic'

export default async function LinksPage() {
  await requireAdminPageSession()

  const [links, categories] = await Promise.all([
    prisma.link.findMany({
      orderBy: { weight: 'desc' },
      take: 1000,
      include: { category: { select: { name: true } } },
    }),
    prisma.category.findMany({
      orderBy: { weight: 'desc' },
      select: { id: true, name: true, parentId: true },
    }),
  ])

  return <LinksClient initialLinks={links} initialCategories={categories} />
}
