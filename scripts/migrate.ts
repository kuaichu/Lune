/**
 * OneNav data migration script
 * Reads old SQLite database and PHP config, writes to new Prisma-managed database.
 *
 * Usage: .\node_modules\.bin\tsx.cmd scripts/migrate.ts
 */

import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

const OLD_DB_PATH = path.resolve(__dirname, '../Old Reference Project/data/onenav.db3')
const OLD_CONFIG_PATH = path.resolve(__dirname, '../Old Reference Project/data/config.php')
const NEW_DB_PATH = path.resolve(__dirname, '../prisma/onenav.db')

function toSafeInteger(val: unknown, field: string): number {
  const numberValue = typeof val === 'number'
    ? val
    : typeof val === 'string' && /^-?\d+$/.test(val.trim())
      ? Number(val)
      : Number.NaN
  if (!Number.isSafeInteger(numberValue)) {
    throw new Error(`${field} 不是安全整数`)
  }
  return numberValue
}

async function main() {
  console.log('Starting data migration...')

  if (!fs.existsSync(OLD_DB_PATH)) {
    console.error(`Old database not found: ${OLD_DB_PATH}`)
    throw new Error(`Old database not found: ${OLD_DB_PATH}`)
  }

  const oldDb = new Database(OLD_DB_PATH, { readonly: true, fileMustExist: true })
  let newDb: Database.Database | null = null

  try {
    // Read config.php for user/password
    let username = 'admin'
    let encryptedPassword = ''

    if (fs.existsSync(OLD_CONFIG_PATH)) {
      const configContent = fs.readFileSync(OLD_CONFIG_PATH, 'utf-8')
      const userMatch = configContent.match(/define\('USER','([^']+)'\)/)
      const passMatch = configContent.match(/define\('ENCRYPTED_PASSWORD','([^']+)'\)/)
      if (userMatch) username = userMatch[1]
      if (passMatch) encryptedPassword = passMatch[1]
    }

    const oldCategories = oldDb.prepare('SELECT * FROM on_categorys').all() as Record<string, unknown>[]
    const oldLinks = oldDb.prepare('SELECT * FROM on_links').all() as Record<string, unknown>[]
    const oldOptions = oldDb.prepare('SELECT * FROM on_options').all() as Record<string, unknown>[]
    const categoryIds = new Set(oldCategories.map((category) => toSafeInteger(category.id, 'Category.id')))
    const normalizedParents = new Map<number, number | null>()

    let orphanCategoryCount = 0
    let selfLoopCount = 0
    for (const category of oldCategories) {
      const id = toSafeInteger(category.id, 'Category.id')
      const fid = toSafeInteger(category.fid, 'Category.fid')
      if (id <= 0 || fid < 0) throw new Error('Category id/fid 必须是非负安全整数，且 id 必须大于 0')
      if (fid === id) selfLoopCount += 1
      if (fid !== 0 && !categoryIds.has(fid)) orphanCategoryCount += 1
      normalizedParents.set(id, fid === 0 ? null : fid)
    }

    const { cycleCount, maxDepth } = analyzeCategoryParents(normalizedParents)
    if (orphanCategoryCount || selfLoopCount || cycleCount || maxDepth > 2) {
      throw new Error(
        `Category preflight failed: orphan=${orphanCategoryCount}, self=${selfLoopCount}, cycles=${cycleCount}, maxDepth=${maxDepth}`
      )
    }

    let zeroLinkCount = 0
    let nullLinkCount = 0
    let orphanLinkCount = 0
    for (const link of oldLinks) {
      if (link.fid === null || link.fid === undefined) {
        nullLinkCount += 1
        continue
      }
      const fid = toSafeInteger(link.fid, 'Link.fid')
      if (fid === 0) zeroLinkCount += 1
      else if (fid < 0 || !categoryIds.has(fid)) orphanLinkCount += 1
    }
    if (zeroLinkCount || nullLinkCount || orphanLinkCount) {
      throw new Error(
        `Link preflight failed: fid0=${zeroLinkCount}, null=${nullLinkCount}, orphan=${orphanLinkCount}`
      )
    }

    newDb = new Database(NEW_DB_PATH, { fileMustExist: true })
    newDb.pragma('foreign_keys = ON')
    const targetCounts = ['on_categorys', 'on_links', 'on_options'].map((table) => (
      newDb!.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }
    ).count)
    if (targetCounts.some((count) => count !== 0)) {
      throw new Error('Target database must be empty before migration')
    }

    const existingOptionKeys = new Set(oldOptions.map((option) => String(option.key || '')))
    const credentialRows = encryptedPassword
      ? [
          ...(!existingOptionKeys.has('user_password') ? [['user_password', encryptedPassword]] : []),
          ...(!existingOptionKeys.has('username') ? [['username', username]] : []),
        ]
      : []
    const expectedOptionCount = oldOptions.length + credentialRows.length

    const migrate = newDb.transaction(() => {
      const insertCat = newDb!.prepare(`
        INSERT INTO on_categorys (id, name, fid, property, weight, description, font_icon, add_time, up_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const category of oldCategories) {
        const id = toSafeInteger(category.id, 'Category.id')
        insertCat.run(
          id,
          String(category.name || ''),
          normalizedParents.get(id) ?? null,
          toSafeInteger(category.property, 'Category.property'),
          toSafeInteger(category.weight, 'Category.weight'),
          String(category.description || ''),
          String(category.font_icon || ''),
          toSafeInteger(category.add_time, 'Category.add_time'),
          toSafeInteger(category.up_time, 'Category.up_time'),
        )
      }

      const insertLink = newDb!.prepare(`
        INSERT INTO on_links (id, fid, title, url, url_standby, description, weight, property, font_icon, topping, check_status, last_checked_time, add_time, up_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const link of oldLinks) {
        insertLink.run(
          toSafeInteger(link.id, 'Link.id'),
          toSafeInteger(link.fid, 'Link.fid'),
          String(link.title || ''),
          String(link.url || ''),
          String(link.url_standby || ''),
          String(link.description || ''),
          toSafeInteger(link.weight, 'Link.weight'),
          toSafeInteger(link.property, 'Link.property'),
          String(link.font_icon || ''),
          toSafeInteger(link.topping, 'Link.topping'),
          toSafeInteger(link.check_status, 'Link.check_status'),
          String(link.last_checked_time || ''),
          toSafeInteger(link.add_time, 'Link.add_time'),
          toSafeInteger(link.up_time, 'Link.up_time'),
        )
      }

      const insertOption = newDb!.prepare(`
        INSERT INTO on_options (id, key, value, extend)
        VALUES (?, ?, ?, ?)
      `)
      for (const option of oldOptions) {
        let value = String(option.value || '')
        if (value.startsWith('a:')) {
          try {
            value = JSON.stringify(parsePhpSerialized(value))
          } catch {
            // Preserve source value when the legacy serializer is unsupported.
          }
        }
        insertOption.run(
          toSafeInteger(option.id, 'Option.id'),
          String(option.key || ''),
          value,
          String(option.extend || ''),
        )
      }

      const insertCredential = newDb!.prepare('INSERT INTO on_options (key, value, extend) VALUES (?, ?, ?)')
      for (const [key, value] of credentialRows) insertCredential.run(key, value, '')

      const counts = {
        categories: (newDb!.prepare('SELECT COUNT(*) AS count FROM on_categorys').get() as { count: number }).count,
        links: (newDb!.prepare('SELECT COUNT(*) AS count FROM on_links').get() as { count: number }).count,
        options: (newDb!.prepare('SELECT COUNT(*) AS count FROM on_options').get() as { count: number }).count,
      }
      if (
        counts.categories !== oldCategories.length
        || counts.links !== oldLinks.length
        || counts.options !== expectedOptionCount
      ) {
        throw new Error(`Count verification failed: Category=${counts.categories}, Link=${counts.links}, Option=${counts.options}`)
      }
      const foreignKeyViolations = newDb!.prepare('PRAGMA foreign_key_check').all().length
      if (foreignKeyViolations !== 0) {
        throw new Error(`foreign_key_check failed: ${foreignKeyViolations}`)
      }
    })

    migrate()
    console.log(`Migration completed! Categories: ${oldCategories.length}, Links: ${oldLinks.length}, Options: ${expectedOptionCount}`)
  } finally {
    oldDb.close()
    newDb?.close()
  }
}

function analyzeCategoryParents(parents: Map<number, number | null>) {
  const cycles = new Set<string>()
  let maxDepth = 0
  for (const id of parents.keys()) {
    const pathIds: number[] = []
    const positions = new Map<number, number>()
    let current: number | null = id
    let depth = 0
    while (current !== null && parents.has(current)) {
      const cycleStart = positions.get(current)
      if (cycleStart !== undefined) {
        cycles.add(pathIds.slice(cycleStart).sort((left, right) => left - right).join(','))
        break
      }
      positions.set(current, pathIds.length)
      pathIds.push(current)
      depth += 1
      current = parents.get(current) ?? null
    }
    maxDepth = Math.max(maxDepth, depth)
  }
  return { cycleCount: cycles.size, maxDepth }
}

function parsePhpSerialized(str: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const keys: string[] = []
  const keyPattern = /s:\d+:"([^"]+)"/g
  let match

  while ((match = keyPattern.exec(str)) !== null) {
    keys.push(match[1])
  }

  let searchPos = 0
  for (const key of keys) {
    const keyEndIdx = str.indexOf(`"${key}"`, searchPos)
    if (keyEndIdx === -1) continue

    searchPos = keyEndIdx + key.length + 3
    const rest = str.slice(searchPos)

    const strMatch = rest.match(/^s:(\d+):"((?:[^"\\]|\\.)*)"/)
    if (strMatch) {
      result[key] = strMatch[2]
      searchPos += strMatch[0].length
      continue
    }

    const intMatch = rest.match(/^i:(\d+)/)
    if (intMatch) {
      result[key] = parseInt(intMatch[1])
      searchPos += intMatch[0].length
      continue
    }
  }

  return result
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Migration failed')
  process.exitCode = 1
})
