export const MAX_CATEGORY_ANCESTOR_DEPTH = 2

export type CategoryVisibilityNode = {
  id: number
  parentId: number | null
  property: number
}

type LoadCategory = (id: number) => Promise<CategoryVisibilityNode | null>

type LinkAccessInput = {
  isAuthenticated: boolean
  linkProperty: number
  categoryId: number
  loadCategory: LoadCategory
}

export async function canAccessLink({
  isAuthenticated,
  linkProperty,
  categoryId,
  loadCategory,
}: LinkAccessInput): Promise<boolean> {
  if (isAuthenticated) return true
  if (linkProperty !== 0) return false
  return isPublicCategoryHierarchy(categoryId, loadCategory)
}

export async function isPublicCategoryHierarchy(
  categoryId: number,
  loadCategory: LoadCategory
): Promise<boolean> {
  if (!Number.isSafeInteger(categoryId) || categoryId <= 0) return false

  const visited = new Set<number>()
  let currentId = categoryId

  for (let depth = 0; depth < MAX_CATEGORY_ANCESTOR_DEPTH; depth += 1) {
    if (visited.has(currentId)) return false
    visited.add(currentId)

    const category = await loadCategory(currentId)
    if (!category || category.id !== currentId || category.property !== 0) return false

    if (category.parentId === null) return true
    if (!Number.isSafeInteger(category.parentId) || category.parentId <= 0) return false

    currentId = category.parentId
  }

  return false
}
