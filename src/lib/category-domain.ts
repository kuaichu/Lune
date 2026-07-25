export type CategoryParentNode = {
  id: number
  parentId: number | null
}

type LoadCategory = (id: number) => Promise<CategoryParentNode | null>

type ValidateCategoryParentChangeInput = {
  mode: 'create' | 'update'
  categoryId?: number
  currentParentId?: number | null
  parentIdProvided: boolean
  parentId: unknown
  loadCategory: LoadCategory
  hasChildren: (id: number) => Promise<boolean>
}

export type CategoryParentValidationResult =
  | { ok: true; parentId: number | null | undefined }
  | { ok: false; error: string }

type ValidateLinkCategoryInput = {
  mode: 'create' | 'update'
  categoryIdProvided: boolean
  categoryId: unknown
  loadCategory: LoadCategory
}

export type LinkCategoryValidationResult =
  | { ok: true; categoryId: number | undefined }
  | { ok: false; error: string }

export async function validateCategoryParentChange({
  mode,
  categoryId,
  parentIdProvided,
  parentId,
  loadCategory,
  hasChildren,
}: ValidateCategoryParentChangeInput): Promise<CategoryParentValidationResult> {
  if (!parentIdProvided) {
    if (mode === 'update') {
      return { ok: true, parentId: undefined }
    }
    return { ok: false, error: '必须明确提供父分类' }
  }

  if (parentId === null) {
    return { ok: true, parentId: null }
  }

  if (!Number.isSafeInteger(parentId) || (parentId as number) <= 0) {
    return { ok: false, error: '父分类必须是正的安全整数或 null' }
  }

  const normalizedParentId = parentId as number
  if (categoryId === normalizedParentId) {
    return { ok: false, error: '分类不能作为自己的父分类' }
  }

  const parent = await loadCategory(normalizedParentId)
  if (!parent) {
    return { ok: false, error: '父分类不存在' }
  }
  if (parent.parentId !== null) {
    return { ok: false, error: '最多只允许两级分类' }
  }

  if (mode === 'update' && categoryId !== undefined && await hasChildren(categoryId)) {
    return { ok: false, error: '含有子分类的分类不能移动到其他分类下' }
  }

  return { ok: true, parentId: normalizedParentId }
}

export async function validateLinkCategory({
  mode,
  categoryIdProvided,
  categoryId,
  loadCategory,
}: ValidateLinkCategoryInput): Promise<LinkCategoryValidationResult> {
  if (!categoryIdProvided) {
    if (mode === 'update') {
      return { ok: true, categoryId: undefined }
    }
    return { ok: false, error: '必须选择分类' }
  }

  if (!Number.isSafeInteger(categoryId) || (categoryId as number) <= 0) {
    return { ok: false, error: '分类 ID 必须是正的安全整数' }
  }

  const normalizedCategoryId = categoryId as number
  if (!await loadCategory(normalizedCategoryId)) {
    return { ok: false, error: '分类不存在' }
  }

  return { ok: true, categoryId: normalizedCategoryId }
}
