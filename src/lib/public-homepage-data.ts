export type CategoryOptionSource = {
  id: number
  name: string
  parentId: number | null
}

export type CategoryOption = {
  id: number
  name: string
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
