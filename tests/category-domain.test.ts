import assert from 'node:assert/strict'
import test from 'node:test'

import {
  validateCategoryParentChange,
  validateLinkCategory,
} from '../src/lib/category-domain'

test('accepts null as the parent of a new root category', async () => {
  const result = await validateCategoryParentChange({
    mode: 'create',
    parentIdProvided: true,
    parentId: null,
    loadCategory: async () => null,
    hasChildren: async () => false,
  })

  assert.deepEqual(result, { ok: true, parentId: null })
})

test('rejects missing, zero, negative, non-integer, and string parent IDs', async () => {
  for (const parentId of [undefined, 0, -1, 1.5, '1', '']) {
    const result = await validateCategoryParentChange({
      mode: 'create',
      parentIdProvided: parentId !== undefined,
      parentId,
      loadCategory: async () => null,
      hasChildren: async () => false,
    })

    assert.equal(result.ok, false, `expected ${String(parentId)} to be rejected`)
  }
})

test('allows a root category to be used as a parent', async () => {
  const result = await validateCategoryParentChange({
    mode: 'create',
    parentIdProvided: true,
    parentId: 4,
    loadCategory: async (id) => id === 4 ? { id: 4, parentId: null } : null,
    hasChildren: async () => false,
  })

  assert.deepEqual(result, { ok: true, parentId: 4 })
})

test('rejects making a category its own parent', async () => {
  const result = await validateCategoryParentChange({
    mode: 'update',
    categoryId: 4,
    currentParentId: null,
    parentIdProvided: true,
    parentId: 4,
    loadCategory: async () => ({ id: 4, parentId: null }),
    hasChildren: async () => false,
  })

  assert.equal(result.ok, false)
})

test('keeps the existing parent when an update omits parentId', async () => {
  const result = await validateCategoryParentChange({
    mode: 'update',
    categoryId: 7,
    currentParentId: 4,
    parentIdProvided: false,
    parentId: undefined,
    loadCategory: async () => null,
    hasChildren: async () => false,
  })

  assert.deepEqual(result, { ok: true, parentId: undefined })
})

test('rejects moving a category with children below another root', async () => {
  const result = await validateCategoryParentChange({
    mode: 'update',
    categoryId: 1,
    currentParentId: null,
    parentIdProvided: true,
    parentId: 4,
    loadCategory: async (id) => id === 4 ? { id: 4, parentId: null } : null,
    hasChildren: async (id) => id === 1,
  })

  assert.equal(result.ok, false)
})

test('rejects a parent category that does not exist', async () => {
  const result = await validateCategoryParentChange({
    mode: 'create',
    parentIdProvided: true,
    parentId: 99,
    loadCategory: async () => null,
    hasChildren: async () => false,
  })

  assert.equal(result.ok, false)
})

test('rejects creating a third category level', async () => {
  const result = await validateCategoryParentChange({
    mode: 'create',
    parentIdProvided: true,
    parentId: 2,
    loadCategory: async () => ({ id: 2, parentId: 1 }),
    hasChildren: async () => false,
  })

  assert.equal(result.ok, false)
})

test('rejects a proposed parent chain that would form a cycle', async () => {
  const result = await validateCategoryParentChange({
    mode: 'update',
    categoryId: 1,
    currentParentId: null,
    parentIdProvided: true,
    parentId: 2,
    loadCategory: async () => ({ id: 2, parentId: 1 }),
    hasChildren: async () => false,
  })

  assert.equal(result.ok, false)
})

test('allows moving a child category to the root', async () => {
  const result = await validateCategoryParentChange({
    mode: 'update',
    categoryId: 2,
    currentParentId: 1,
    parentIdProvided: true,
    parentId: null,
    loadCategory: async () => null,
    hasChildren: async () => false,
  })

  assert.deepEqual(result, { ok: true, parentId: null })
})

test('allows a link to reference a real category', async () => {
  const result = await validateLinkCategory({
    mode: 'create',
    categoryIdProvided: true,
    categoryId: 2,
    loadCategory: async (id) => id === 2 ? { id: 2, parentId: 1 } : null,
  })

  assert.deepEqual(result, { ok: true, categoryId: 2 })
})

test('rejects missing, null, zero, negative, non-integer, string, and orphan link categories', async () => {
  const invalidValues = [undefined, null, 0, -1, 1.5, '2', '']
  for (const categoryId of invalidValues) {
    const result = await validateLinkCategory({
      mode: 'create',
      categoryIdProvided: categoryId !== undefined,
      categoryId,
      loadCategory: async () => null,
    })
    assert.equal(result.ok, false, `expected ${String(categoryId)} to be rejected`)
  }

  const orphanResult = await validateLinkCategory({
    mode: 'create',
    categoryIdProvided: true,
    categoryId: 99,
    loadCategory: async () => null,
  })
  assert.equal(orphanResult.ok, false)
})

test('keeps the existing link category when an update omits categoryId', async () => {
  const result = await validateLinkCategory({
    mode: 'update',
    categoryIdProvided: false,
    categoryId: undefined,
    loadCategory: async () => null,
  })

  assert.deepEqual(result, { ok: true, categoryId: undefined })
})
