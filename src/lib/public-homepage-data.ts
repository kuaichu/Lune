export type CategoryOptionSource = {
  id: number
  name: string
  parentId: number | null
}

export type CategoryOption = {
  id: number
  name: string
}

export type PublicLinkData = {
  id: number
  title: string
  url: string
  description: string
  property: number
  // Link check result (see lib/link-check); missing means unchecked.
  checkStatus?: number
}

export type PublicCategoryData = {
  id: number
  name: string
  property: number
  fontIcon: string | null
  children: { id: number; name: string; fontIcon: string | null; children: never[] }[]
  links: PublicLinkData[]
  childSections: {
    id: number
    name: string
    property: number
    fontIcon: string | null
    links: PublicLinkData[]
  }[]
}

export function buildCategoryOptions(
  categories: readonly CategoryOptionSource[],
  isLoggedIn: boolean
): CategoryOption[] {
  if (!isLoggedIn) return []

  const categoryById = new Map(categories.map((category) => [category.id, category]))
  return categories.map((category) => {
    const parent = category.parentId === null ? null : categoryById.get(category.parentId)
    return {
      id: category.id,
      name: parent ? `${parent.name} / ${category.name}` : category.name,
    }
  })
}

export function filterPublicCategories(
  categories: readonly PublicCategoryData[],
  query: string
): PublicCategoryData[] | readonly PublicCategoryData[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return categories

  const matches = (link: PublicLinkData) =>
    [link.title, link.description, link.url].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    )

  return categories
    .map((category) => {
      const links = category.links.filter(matches)
      const childSections = category.childSections
        .map((child) => ({ ...child, links: child.links.filter(matches) }))
        .filter((child) => child.links.length > 0)

      return { ...category, links, childSections }
    })
    .filter((category) => category.links.length > 0 || category.childSections.length > 0)
}
