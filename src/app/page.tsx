import { prisma } from '@/lib/prisma'
import { getCurrentSession } from '@/lib/auth-server'
import { PublicHomepage } from '@/components/public/PublicHomepage'
import { buildCategoryOptions } from '@/lib/public-homepage-data'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const isLoggedIn = Boolean(await getCurrentSession())

  const [siteOption, categories, links] = await Promise.all([
    prisma.option.findUnique({ where: { key: 's_site' } }),
    prisma.category.findMany({
      where: isLoggedIn ? {} : { property: 0 },
      orderBy: { weight: 'desc' },
    }),
    prisma.link.findMany({
      where: isLoggedIn ? {} : { property: 0 },
      orderBy: { weight: 'desc' },
    }),
  ])

  let siteTitle = 'Lune'
  let sidebarAutoExpand = true
  let showLinkStatus = true
  if (siteOption?.value) {
    try {
      const site = JSON.parse(siteOption.value)
      siteTitle = site.title || 'Lune'
      sidebarAutoExpand = site.sidebar_auto_expand !== false
      showLinkStatus = site.show_link_status !== false
    } catch {
      const match = siteOption.value.match(/s:5:"title";s:\d+:"([^"]+)"/)
      if (match) siteTitle = match[1]
    }
  }

  // Group links by category in JS (avoids N+1 nested SQL queries)
  const linksByCat = new Map<number, typeof links>()
  for (const link of links) {
    const arr = linksByCat.get(link.categoryId) || []
    arr.push(link)
    linksByCat.set(link.categoryId, arr)
  }

  // Build category tree
  const topLevel = categories.filter((c) => c.parentId === null)
  const categoryOptions = buildCategoryOptions(categories, isLoggedIn)

  const serialized = topLevel.map((cat) => {
    const children = categories.filter((c) => c.parentId === cat.id)
    const ownLinks = (linksByCat.get(cat.id) || []).map((link) => serializeLink(link, showLinkStatus))
    const childSections = children
      .filter((c) => (linksByCat.get(c.id) || []).length > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        property: c.property,
        fontIcon: c.fontIcon,
        links: (linksByCat.get(c.id) || []).map((link) => serializeLink(link, showLinkStatus)),
      }))

    return {
      id: cat.id,
      name: cat.name,
      property: cat.property,
      fontIcon: cat.fontIcon,
      children: children.map((c) => ({
        id: c.id,
        name: c.name,
        fontIcon: c.fontIcon,
        children: [] as never[],
      })),
      links: ownLinks,
      childSections,
    }
  })

  return (
    <PublicHomepage
      categories={serialized}
      categoryOptions={categoryOptions}
      siteTitle={siteTitle}
      isLoggedIn={isLoggedIn}
      sidebarAutoExpand={sidebarAutoExpand}
    />
  )
}

function serializeLink(
  link: { id: number; title: string; url: string; description: string; property: number; checkStatus: number },
  includeStatus: boolean
) {
  return {
    id: link.id,
    title: link.title,
    url: link.url,
    description: link.description,
    property: link.property,
    // With the setting off the status never reaches the browser, not just hidden.
    ...(includeStatus ? { checkStatus: link.checkStatus } : {}),
  }
}
