export type BookmarkCategory = {
  id: number
  name: string
  parentId: number | null
  weight: number
  addTime: number
}

export type BookmarkLink = {
  id: number
  categoryId: number
  title: string
  url: string
  description: string
  weight: number
  addTime: number
  property?: number
}

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ENTITIES[character])
}

function byWeightThenId<T extends { id: number; weight: number }>(left: T, right: T): number {
  return right.weight - left.weight || left.id - right.id
}

function addDateAttribute(addTime: number): string {
  return Number.isFinite(addTime) && addTime > 0
    ? ` ADD_DATE="${Math.trunc(addTime)}"`
    : ''
}

function renderLink(link: BookmarkLink, indent: string): string[] {
  const lines = [
    `${indent}<DT><A HREF="${escapeHtml(link.url)}"${addDateAttribute(link.addTime)}>${escapeHtml(link.title)}</A>`,
  ]
  if (link.description) {
    lines.push(`${indent}<DD>${escapeHtml(link.description)}`)
  }
  return lines
}

export function generateBookmarkHtml(
  categories: readonly BookmarkCategory[],
  links: readonly BookmarkLink[]
): string {
  const roots = categories
    .filter((category) => category.parentId === null)
    .sort(byWeightThenId)
  const childrenByParent = new Map<number, BookmarkCategory[]>()
  const linksByCategory = new Map<number, BookmarkLink[]>()

  for (const category of categories) {
    if (category.parentId === null) continue
    const children = childrenByParent.get(category.parentId) ?? []
    children.push(category)
    childrenByParent.set(category.parentId, children)
  }
  for (const children of childrenByParent.values()) children.sort(byWeightThenId)

  for (const link of links) {
    const categoryLinks = linksByCategory.get(link.categoryId) ?? []
    categoryLinks.push(link)
    linksByCategory.set(link.categoryId, categoryLinks)
  }
  for (const categoryLinks of linksByCategory.values()) categoryLinks.sort(byWeightThenId)

  const output = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file. -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Lune Bookmarks</TITLE>',
    '<H1>Lune Bookmarks</H1>',
    '<DL><p>',
  ]

  for (const root of roots) {
    output.push(`  <DT><H3${addDateAttribute(root.addTime)}>${escapeHtml(root.name)}</H3>`)
    output.push('  <DL><p>')

    for (const link of linksByCategory.get(root.id) ?? []) {
      output.push(...renderLink(link, '    '))
    }

    for (const child of childrenByParent.get(root.id) ?? []) {
      output.push(`    <DT><H3${addDateAttribute(child.addTime)}>${escapeHtml(child.name)}</H3>`)
      output.push('    <DL><p>')
      for (const link of linksByCategory.get(child.id) ?? []) {
        output.push(...renderLink(link, '      '))
      }
      output.push('    </DL><p>')
    }

    output.push('  </DL><p>')
  }

  output.push('</DL><p>', '')
  return output.join('\n')
}
