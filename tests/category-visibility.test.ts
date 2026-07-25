import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canAccessLink,
  isPublicCategoryHierarchy,
  type CategoryVisibilityNode,
} from '../src/lib/category-visibility'
import { buildCategoryOptions } from '../src/lib/public-homepage-data'

test('allows authenticated sessions and rejects anonymous private links', async () => {
  let loadCount = 0
  const loadCategory = async () => {
    loadCount += 1
    return null
  }

  assert.equal(
    await canAccessLink({
      isAuthenticated: true,
      linkProperty: 1,
      categoryId: 99,
      loadCategory,
    }),
    true
  )
  assert.equal(
    await canAccessLink({
      isAuthenticated: false,
      linkProperty: 1,
      categoryId: 99,
      loadCategory,
    }),
    false
  )
  assert.equal(loadCount, 0)
})

test('accepts a public root and child hierarchy ending at null', async () => {
  const categories = new Map<number, CategoryVisibilityNode>([
    [1, { id: 1, parentId: null, property: 0 }],
    [2, { id: 2, parentId: 1, property: 0 }],
  ])

  assert.equal(
    await canAccessLink({
      isAuthenticated: false,
      linkProperty: 0,
      categoryId: 2,
      loadCategory: loadFrom(categories),
    }),
    true
  )
})

test('rejects private or missing ancestors', async () => {
  const privateAncestor = new Map<number, CategoryVisibilityNode>([
    [1, { id: 1, parentId: null, property: 1 }],
    [2, { id: 2, parentId: 1, property: 0 }],
  ])
  const missingAncestor = new Map<number, CategoryVisibilityNode>([
    [2, { id: 2, parentId: 99, property: 0 }],
  ])

  assert.equal(
    await canAccessLink({
      isAuthenticated: false,
      linkProperty: 0,
      categoryId: 2,
      loadCategory: loadFrom(privateAncestor),
    }),
    false
  )
  assert.equal(await isPublicCategoryHierarchy(2, loadFrom(missingAncestor)), false)
})

test('rejects cyclic category hierarchies', async () => {
  const categories = new Map<number, CategoryVisibilityNode>([
    [1, { id: 1, parentId: 2, property: 0 }],
    [2, { id: 2, parentId: 1, property: 0 }],
  ])

  assert.equal(await isPublicCategoryHierarchy(1, loadFrom(categories)), false)
})

test('rejects a third category level', async () => {
  const categories = new Map<number, CategoryVisibilityNode>([
    [1, { id: 1, parentId: null, property: 0 }],
    [2, { id: 2, parentId: 1, property: 0 }],
    [3, { id: 3, parentId: 2, property: 0 }],
  ])

  assert.equal(
    await isPublicCategoryHierarchy(3, loadFrom(categories)),
    false
  )
})

test('does not accept zero as a root sentinel', async () => {
  const categories = new Map<number, CategoryVisibilityNode>([
    [1, { id: 1, parentId: 0, property: 0 }],
  ])

  assert.equal(await isPublicCategoryHierarchy(1, loadFrom(categories)), false)
})

test('does not serialize category options for anonymous visitors', () => {
  const queriedCategories = [
    { id: 2, name: 'public-child-under-private-parent', parentId: 1 },
  ]

  assert.deepEqual(buildCategoryOptions(queriedCategories, false), [])
})

test('builds the existing two-level category labels for authenticated visitors', () => {
  const categories = [
    { id: 1, name: 'parent', parentId: null },
    { id: 2, name: 'child', parentId: 1 },
  ]

  assert.deepEqual(buildCategoryOptions(categories, true), [
    { id: 1, name: 'parent' },
    { id: 2, name: 'parent / child' },
  ])
})

function loadFrom(categories: Map<number, CategoryVisibilityNode>) {
  return async (id: number) => categories.get(id) ?? null
}
