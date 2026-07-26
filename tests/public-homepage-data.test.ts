import assert from 'node:assert/strict'
import test from 'node:test'

import {
  filterPublicCategories,
  type PublicCategoryData,
} from '../src/lib/public-homepage-data'

const categories: PublicCategoryData[] = [
  {
    id: 1,
    name: 'Development',
    property: 0,
    fontIcon: null,
    children: [],
    links: [
      {
        id: 11,
        title: 'TypeScript Handbook',
        url: 'https://www.typescriptlang.org/docs/handbook/',
        description: 'Typed JavaScript documentation',
        property: 0,
      },
    ],
    childSections: [
      {
        id: 2,
        name: 'Reference',
        property: 0,
        fontIcon: null,
        links: [
          {
            id: 12,
            title: 'MDN',
            url: 'https://developer.mozilla.org/en-US/docs/Web/API/URL',
            description: 'Browser platform reference',
            property: 0,
          },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'News',
    property: 0,
    fontIcon: null,
    children: [],
    links: [
      {
        id: 13,
        title: 'Daily Brief',
        url: 'https://news.example.com/today',
        description: 'Morning headlines',
        property: 0,
      },
    ],
    childSections: [],
  },
]

test('public search matches link titles', () => {
  const result = filterPublicCategories(categories, 'handbook')

  assert.deepEqual(result.map((category) => category.id), [1])
  assert.deepEqual(result[0].links.map((link) => link.id), [11])
  assert.deepEqual(result[0].childSections, [])
})

test('public search matches link descriptions', () => {
  const result = filterPublicCategories(categories, 'platform reference')

  assert.deepEqual(result.map((category) => category.id), [1])
  assert.deepEqual(result[0].links, [])
  assert.deepEqual(result[0].childSections[0].links.map((link) => link.id), [12])
})

test('public search matches URL domains and paths', () => {
  assert.deepEqual(
    filterPublicCategories(categories, 'typescriptlang.org').flatMap((category) => category.links.map((link) => link.id)),
    [11]
  )
  assert.deepEqual(
    filterPublicCategories(categories, '/WEB/API/url').flatMap((category) =>
      category.childSections.flatMap((child) => child.links.map((link) => link.id))
    ),
    [12]
  )
})

test('public search ignores case and surrounding whitespace', () => {
  const result = filterPublicCategories(categories, '  TyPeD JaVaScRiPt  ')

  assert.deepEqual(result.map((category) => category.id), [1])
  assert.deepEqual(result[0].links.map((link) => link.id), [11])
})

test('public search hides categories and child sections without matching links', () => {
  const result = filterPublicCategories(categories, 'morning headlines')

  assert.deepEqual(result.map((category) => category.id), [3])
  assert.deepEqual(result[0].childSections, [])
})

test('an empty public search returns the complete grouping', () => {
  assert.equal(filterPublicCategories(categories, '   '), categories)
})
