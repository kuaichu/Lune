import assert from 'node:assert/strict'
import test from 'node:test'

import { generateBookmarkHtml } from '../src/lib/bookmark-export'

test('bookmark HTML preserves root folders, child folders, and link placement', () => {
  const html = generateBookmarkHtml(
    [
      { id: 1, name: 'Root', parentId: null, weight: 10, addTime: 100 },
      { id: 2, name: 'Child', parentId: 1, weight: 5, addTime: 200 },
    ],
    [
      { id: 11, categoryId: 1, title: 'Root link', url: 'https://root.example', description: 'At root', weight: 3, addTime: 300 },
      { id: 12, categoryId: 2, title: 'Child link', url: 'https://child.example', description: 'In child', weight: 2, addTime: 400 },
    ]
  )

  const rootFolder = html.indexOf('>Root</H3>')
  const rootLink = html.indexOf('>Root link</A>')
  const childFolder = html.indexOf('>Child</H3>')
  const childLink = html.indexOf('>Child link</A>')

  assert.ok(rootFolder >= 0)
  assert.ok(rootFolder < rootLink)
  assert.ok(rootLink < childFolder)
  assert.ok(childFolder < childLink)
  assert.match(html, /ADD_DATE="300"/)
  assert.match(html, /<DD>At root/)
})

test('bookmark HTML includes private links and sorts categories and links by weight then ID', () => {
  const html = generateBookmarkHtml(
    [
      { id: 2, name: 'Lower', parentId: null, weight: 1, addTime: 0 },
      { id: 1, name: 'Higher', parentId: null, weight: 2, addTime: 0 },
      { id: 3, name: 'Higher later ID', parentId: null, weight: 2, addTime: 0 },
      { id: 5, name: 'Child later ID', parentId: 1, weight: 4, addTime: 0 },
      { id: 4, name: 'Child first ID', parentId: 1, weight: 4, addTime: 0 },
    ],
    [
      { id: 3, categoryId: 1, title: 'Third', url: 'https://3.example', description: '', weight: 1, addTime: 0, property: 0 },
      { id: 2, categoryId: 1, title: 'Private second', url: 'https://2.example', description: '', weight: 1, addTime: 0, property: 1 },
    ]
  )

  assert.ok(html.indexOf('>Higher</H3>') < html.indexOf('>Lower</H3>'))
  assert.ok(html.indexOf('>Higher</H3>') < html.indexOf('>Higher later ID</H3>'))
  assert.ok(html.indexOf('>Child first ID</H3>') < html.indexOf('>Child later ID</H3>'))
  assert.ok(html.indexOf('>Private second</A>') < html.indexOf('>Third</A>'))
  assert.match(html, />Private second<\/A>/)
})

test('bookmark HTML escapes names, titles, descriptions, and attribute values', () => {
  const html = generateBookmarkHtml(
    [{ id: 1, name: 'A & <B> "folder"', parentId: null, weight: 0, addTime: 0 }],
    [{
      id: 1,
      categoryId: 1,
      title: 'T & <U> "title"',
      url: 'https://example.com/?a=1&b="<value>"',
      description: 'D & <E> "description"',
      weight: 0,
      addTime: 0,
    }]
  )

  assert.match(html, /A &amp; &lt;B&gt; &quot;folder&quot;/)
  assert.match(html, /T &amp; &lt;U&gt; &quot;title&quot;/)
  assert.match(html, /HREF="https:\/\/example\.com\/\?a=1&amp;b=&quot;&lt;value&gt;&quot;"/)
  assert.match(html, /D &amp; &lt;E&gt; &quot;description&quot;/)
  assert.doesNotMatch(html, /A & <B>|T & <U>|b="<value>"/)
})

test('empty bookmark data produces a valid Netscape Bookmark document', () => {
  const html = generateBookmarkHtml([], [])

  assert.match(html, /^<!DOCTYPE NETSCAPE-Bookmark-file-1>/)
  assert.match(html, /<META HTTP-EQUIV="Content-Type" CONTENT="text\/html; charset=UTF-8">/)
  assert.match(html, /<DL><p>\n<\/DL><p>\n$/)
})
