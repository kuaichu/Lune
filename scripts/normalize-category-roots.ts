import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  linkSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import Database from 'better-sqlite3'

const PROJECT_ROOT = path.resolve(__dirname, '..')
const BUSINESS_TABLES = ['on_categorys', 'on_links', 'on_options'] as const
const EXPECTED_COUNTS = {
  categoryCount: 59,
  linkCount: 534,
  optionCount: 7,
  rootCount: 16,
} as const

const CATEGORY_SOURCE_SQL = `CREATE TABLE "on_categorys" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "fid" INTEGER NOT NULL DEFAULT 0,
  "property" INTEGER NOT NULL DEFAULT 0,
  "weight" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT NOT NULL DEFAULT '',
  "font_icon" TEXT NOT NULL DEFAULT '',
  "add_time" INTEGER NOT NULL DEFAULT 0,
  "up_time" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "on_categorys_fid_fkey" FOREIGN KEY ("fid") REFERENCES "on_categorys" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`

const CATEGORY_TARGET_SQL = `CREATE TABLE "on_categorys" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "fid" INTEGER,
  "property" INTEGER NOT NULL DEFAULT 0,
  "weight" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT NOT NULL DEFAULT '',
  "font_icon" TEXT NOT NULL DEFAULT '',
  "add_time" INTEGER NOT NULL DEFAULT 0,
  "up_time" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "on_categorys_fid_fkey" FOREIGN KEY ("fid") REFERENCES "on_categorys" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`

const LINK_SQL = `CREATE TABLE "on_links" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "fid" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "url_standby" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "weight" INTEGER NOT NULL DEFAULT 0,
  "property" INTEGER NOT NULL DEFAULT 0,
  "font_icon" TEXT NOT NULL DEFAULT '',
  "topping" INTEGER NOT NULL DEFAULT 0,
  "check_status" INTEGER NOT NULL DEFAULT 0,
  "last_checked_time" TEXT NOT NULL DEFAULT '',
  "add_time" INTEGER NOT NULL DEFAULT 0,
  "up_time" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "on_links_fid_fkey" FOREIGN KEY ("fid") REFERENCES "on_categorys" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`

const OPTION_SQL = `CREATE TABLE "on_options" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "extend" TEXT NOT NULL DEFAULT ''
)`

const OPTION_INDEX_SQL = 'CREATE UNIQUE INDEX "on_options_key_key" ON "on_options"("key")'

type Scalar = string | number | bigint | Buffer | null
type Row = Record<string, Scalar>

export type NormalizationSnapshot = {
  fileHash: string
  journalMode: string
  categoryCount: number
  linkCount: number
  optionCount: number
  rootZeroCount: number
  rootNullCount: number
  orphanCategoryCount: number
  selfLoopCount: number
  cycleCount: number
  maxDepth: number
  zeroLinkCount: number
  nullLinkCount: number
  orphanLinkCount: number
  foreignKeyViolationCount: number
  unexpectedForeignKeyViolationCount: number
  categoryIdsHash: string
  categoryContentHash: string
  categoryNormalizedContentHash: string
  categoryStableHash: string
  nonRootParentsHash: string
  linkIdsHash: string
  linkContentHash: string
  optionContentHash: string
  sqliteSequenceHash: string
}

export type NormalizationResult = {
  status: 'DRY_RUN_READY' | 'COMMITTED_AND_VERIFIED' | 'ALREADY_MIGRATED'
  databasePath: string
  backupPath?: string
  warnings: string[]
  before: NormalizationSnapshot
  after?: NormalizationSnapshot
}

export type NormalizationOptions = {
  databasePath: string
  apply: boolean
  backupPath?: string
  expectedSha256?: string
  backupDeadlineMs?: number
  busyTimeoutMs?: number
  testHooks?: {
    backup?: (sourceDb: Database.Database, temporaryPath: string, deadlineMs: number) => Promise<void>
    beforeBackupPublish?: () => void
    beforeCommit?: () => void
    afterCommit?: () => void
  }
}

export class NormalizationFailure extends Error {
  readonly state: 'NOT_COMMITTED' | 'COMMITTED_VERIFY_FAILED'
  readonly exitCode: 1 | 2
  readonly committed: boolean
  readonly backupPath?: string

  constructor(
    state: 'NOT_COMMITTED' | 'COMMITTED_VERIFY_FAILED',
    message: string,
    backupPath: string | undefined,
    cause?: unknown
  ) {
    super(`${state}: ${message}`, { cause })
    this.name = 'NormalizationFailure'
    this.state = state
    this.exitCode = state === 'NOT_COMMITTED' ? 1 : 2
    this.committed = state === 'COMMITTED_VERIFY_FAILED'
    this.backupPath = backupPath
  }
}

export async function runCategoryRootNormalization(
  options: NormalizationOptions
): Promise<NormalizationResult> {
  if (options.apply) assertApplyDatabasePathIsLocal(options.databasePath)
  const databasePath = normalizeExistingDatabasePath(options.databasePath)
  if (options.apply) assertApplyDatabasePathIsLocal(databasePath)
  if (options.apply) assertNoSQLiteSidecars(databasePath)
  const warnings = collectPathWarnings(options.databasePath, databasePath)
  const readonlyDb = new Database(databasePath, { readonly: true, fileMustExist: true })
  let backupPath: string | undefined
  let temporaryBackupPath: string | undefined

  try {
    const schemaMode = detectSchemaMode(readonlyDb)
    assertSchema(readonlyDb, schemaMode)
    const before = inspectDatabase(readonlyDb, databasePath)

    if (schemaMode === 'target') {
      assertSafeTarget(before)
      if (options.apply) {
        assertExpectedSha(options.expectedSha256, before.fileHash)
        if (before.journalMode !== 'delete') {
          throw new Error(`--apply 要求 journal_mode=DELETE，实际为 ${before.journalMode}`)
        }
      }
      return { status: 'ALREADY_MIGRATED', databasePath, warnings, before, after: before }
    }

    assertSafeSource(before)

    if (!options.apply) {
      return { status: 'DRY_RUN_READY', databasePath, warnings, before }
    }

    const expectedSha256 = assertExpectedSha(options.expectedSha256, before.fileHash)
    if (before.journalMode !== 'delete') {
      throw new Error(`--apply 要求 journal_mode=DELETE，实际为 ${before.journalMode}`)
    }

    backupPath = normalizeBackupPath(options.backupPath, databasePath)
    temporaryBackupPath = `${backupPath}.partial-${randomUUID()}`
    try {
      const backupDeadlineMs = options.backupDeadlineMs ?? 15_000
      if (options.testHooks?.backup) {
        await options.testHooks.backup(readonlyDb, temporaryBackupPath, backupDeadlineMs)
      } else {
        await backupWithDeadline(readonlyDb, temporaryBackupPath, backupDeadlineMs)
      }
      const backupDb = new Database(temporaryBackupPath, { readonly: true, fileMustExist: true })
      try {
        assertSchema(backupDb, 'source')
        const backupSnapshot = inspectDatabase(backupDb, temporaryBackupPath)
        assertLogicalSnapshotEqual(before, backupSnapshot, '备份内容与源数据库不一致')
      } finally {
        backupDb.close()
      }
      options.testHooks?.beforeBackupPublish?.()
      linkSync(temporaryBackupPath, backupPath)
      rmSync(temporaryBackupPath, { force: true })
      temporaryBackupPath = undefined
    } catch (error) {
      if (temporaryBackupPath && existsSync(temporaryBackupPath)) {
        rmSync(temporaryBackupPath, { force: true })
      }
      throw error
    }

    readonlyDb.close()
    const currentHash = sha256File(databasePath)
    if (currentHash !== before.fileHash) {
      throw new Error('备份后数据库 SHA-256 已变化，已中止应用')
    }

    const busyTimeoutMs = options.busyTimeoutMs ?? 5_000
    if (!Number.isInteger(busyTimeoutMs) || busyTimeoutMs < 0 || busyTimeoutMs > 60_000) {
      throw new Error('busy timeout 必须是 0 到 60000 毫秒的整数')
    }
    const committedSnapshot = applyMigration({
      databasePath,
      backupPath,
      before,
      expectedSha256,
      busyTimeoutMs,
      testHooks: options.testHooks,
    })
    return {
      status: 'COMMITTED_AND_VERIFIED',
      databasePath,
      backupPath,
      warnings,
      before,
      after: committedSnapshot,
    }
  } finally {
    if (readonlyDb.open) readonlyDb.close()
  }
}

function applyMigration({
  databasePath,
  backupPath,
  before,
  expectedSha256,
  busyTimeoutMs,
  testHooks,
}: {
  databasePath: string
  backupPath: string
  before: NormalizationSnapshot
  expectedSha256: string
  busyTimeoutMs: number
  testHooks?: NormalizationOptions['testHooks']
}) {
  const db = new Database(databasePath, { fileMustExist: true, timeout: busyTimeoutMs })
  let committed = false
  let result: NormalizationSnapshot | undefined
  let primaryError: unknown
  const cleanupErrors: unknown[] = []

  try {
    db.pragma('foreign_keys = OFF')
    db.exec('BEGIN IMMEDIATE')

    assertNoSQLiteSidecars(databasePath)
    assertSchema(db, 'source')
    const lockedBefore = inspectDatabase(db, databasePath)
    assertLogicalSnapshotEqual(before, lockedBefore, '获得写锁后数据库内容已变化')
    if (lockedBefore.fileHash !== before.fileHash) throw new Error('获得写锁后数据库 SHA-256 已变化')
    if (lockedBefore.fileHash !== expectedSha256) throw new Error('获得写锁后数据库 SHA-256 与 --expected-sha256 不匹配')
    if (lockedBefore.journalMode !== 'delete') {
      throw new Error(`获得写锁后 journal_mode 不再是 DELETE：${lockedBefore.journalMode}`)
    }

    rebuildCategoryTable(db)
    assertSchema(db, 'target')
    const preCommit = inspectDatabase(db, databasePath)
    assertMigrationResult(before, preCommit)
    testHooks?.beforeCommit?.()

    try {
      db.exec('COMMIT')
      committed = true
    } catch (error) {
      committed = !db.inTransaction
      throw error
    }

    db.pragma('foreign_keys = ON')
    testHooks?.afterCommit?.()
    assertSchema(db, 'target')
    const committedSnapshot = inspectDatabase(db, databasePath)
    assertMigrationResult(before, committedSnapshot)
    result = committedSnapshot
  } catch (error) {
    primaryError = error
    if (!committed && db.inTransaction) {
      try {
        db.exec('ROLLBACK')
      } catch (rollbackError) {
        cleanupErrors.push(rollbackError)
      }
    }
  } finally {
    if (db.open) {
      try {
        db.pragma('foreign_keys = ON')
      } catch (pragmaError) {
        cleanupErrors.push(pragmaError)
      }
      try {
        db.close()
      } catch (closeError) {
        cleanupErrors.push(closeError)
      }
    }
  }

  if (!primaryError && cleanupErrors.length > 0) primaryError = cleanupErrors[0]
  if (primaryError) {
    const cleanupSuffix = cleanupErrors.length > 0 ? `；cleanup_errors=${cleanupErrors.length}` : ''
    const message = `${errorMessage(primaryError)}${cleanupSuffix}`
    if (committed) {
      throw new NormalizationFailure('COMMITTED_VERIFY_FAILED', message, backupPath, primaryError)
    }
    throw new NormalizationFailure('NOT_COMMITTED', message, backupPath, primaryError)
  }
  if (!result) throw new NormalizationFailure('NOT_COMMITTED', '迁移未产生验证结果', backupPath)
  return result
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '未知错误'
}

async function backupWithDeadline(
  sourceDb: Database.Database,
  temporaryPath: string,
  deadlineMs: number
) {
  if (!Number.isFinite(deadlineMs) || deadlineMs <= 0) {
    throw new Error('备份 deadline 已到期')
  }
  const deadlineAt = Date.now() + deadlineMs
  await sourceDb.backup(temporaryPath, {
    progress: () => {
      if (Date.now() >= deadlineAt) throw new Error('备份超时')
      return 100
    },
  })
  if (Date.now() >= deadlineAt) throw new Error('备份超时')
}

function assertExpectedSha(expectedSha256: string | undefined, actualSha256: string) {
  if (!expectedSha256 || !/^[0-9a-fA-F]{64}$/.test(expectedSha256)) {
    throw new Error('--apply 必须提供有效的 --expected-sha256')
  }
  const normalized = expectedSha256.toLowerCase()
  if (actualSha256 !== normalized) {
    throw new Error(`数据库 SHA-256 与 --expected-sha256 不匹配：actual=${actualSha256}`)
  }
  return normalized
}

function assertApplyDatabasePathIsLocal(databasePath: string) {
  const reason = networkPathReason(databasePath)
  if (reason) {
    throw new Error(
      `--apply 拒绝网络路径（${reason}）。请先把数据库迁移到运行主机的本地持久磁盘。`
    )
  }
}

function networkPathReason(candidate: string) {
  const windowsPath = candidate.replaceAll('/', '\\')
  if (windowsPath.startsWith('\\\\')) return 'UNC 或设备路径'
  const drive = path.win32.parse(windowsPath).root.slice(0, 2).toUpperCase()
  if (drive === 'S:') return 'S: 是已知映射网络盘'
  return null
}

function collectPathWarnings(requestedPath: string, resolvedPath: string) {
  const warnings = new Set<string>()
  for (const candidate of [requestedPath, resolvedPath]) {
    const reason = networkPathReason(candidate)
    if (reason) warnings.add(`数据库位于网络路径（${reason}）；dry-run 仅供审查，禁止在此路径执行 --apply`)
  }
  return [...warnings]
}

function detectSchemaMode(db: Database.Database): 'source' | 'target' {
  const columns = db.prepare('PRAGMA table_xinfo("on_categorys")').all() as {
    name: string
    notnull: number
    dflt_value: string | null
    hidden: number
  }[]
  const fid = columns.find((column) => column.name === 'fid')
  if (!fid) throw new Error('数据库 schema drift：缺少 Category.fid')
  if (fid.hidden !== 0) throw new Error('数据库 schema drift：Category.fid 是隐藏或生成列')
  if (fid.notnull === 1 && fid.dflt_value === '0') return 'source'
  if (fid.notnull === 0 && fid.dflt_value === null) return 'target'
  throw new Error('数据库 schema drift：无法识别 Category.fid 源/目标结构')
}

function assertNoSQLiteSidecars(databasePath: string) {
  const sidecars = [`${databasePath}-wal`, `${databasePath}-shm`].filter((candidate) => existsSync(candidate))
  if (sidecars.length > 0) {
    throw new Error(`检测到 SQLite sidecar（${sidecars.map((item) => path.basename(item)).join(', ')}），拒绝 --apply`)
  }
}

export function parseNormalizationArguments(args: string[]): NormalizationOptions {
  let databasePath: string | undefined
  let backupPath: string | undefined
  let expectedSha256: string | undefined
  let apply = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--apply') {
      apply = true
    } else if (argument === '--database') {
      databasePath = args[++index]
      if (!databasePath) throw new Error('--database 必须提供路径')
    } else if (argument === '--backup') {
      backupPath = args[++index]
      if (!backupPath) throw new Error('--backup 必须提供路径')
    } else if (argument === '--expected-sha256') {
      expectedSha256 = args[++index]
      if (!expectedSha256) throw new Error('--expected-sha256 必须提供值')
    } else {
      throw new Error(`未知参数：${argument}`)
    }
  }

  if (!databasePath) throw new Error('必须显式提供 --database <绝对路径>')
  if (!path.isAbsolute(databasePath)) throw new Error('--database 必须是绝对路径')
  if (apply && !backupPath) throw new Error('--apply 必须同时提供 --backup <绝对路径>')
  if (apply && !expectedSha256) throw new Error('--apply 必须同时提供 --expected-sha256 <64位十六进制值>')
  if (!apply && backupPath) throw new Error('dry-run 不接受 --backup；只有 --apply 才会创建备份')
  if (backupPath && !path.isAbsolute(backupPath)) throw new Error('--backup 必须是绝对路径')
  if (expectedSha256 && !/^[0-9a-fA-F]{64}$/.test(expectedSha256)) {
    throw new Error('--expected-sha256 必须是 64 位十六进制值')
  }

  return { databasePath, apply, backupPath, expectedSha256: expectedSha256?.toLowerCase() }
}

function normalizeExistingDatabasePath(databasePath: string) {
  if (!path.isAbsolute(databasePath)) throw new Error('--database 必须是绝对路径')
  if (!existsSync(databasePath) || !statSync(databasePath).isFile()) {
    throw new Error('数据库文件不存在')
  }
  return realpathSync.native(databasePath)
}

function normalizeBackupPath(backupPath: string | undefined, databasePath: string) {
  if (!backupPath) throw new Error('--apply 必须同时提供 --backup <绝对路径>')
  const requestedNetworkReason = networkPathReason(backupPath)
  if (requestedNetworkReason) {
    throw new Error(`备份必须位于运行主机的本地持久磁盘，拒绝网络路径（${requestedNetworkReason}）`)
  }
  if (!path.isAbsolute(backupPath)) throw new Error('--backup 必须是绝对路径')
  if (existsSync(backupPath)) throw new Error('备份路径已存在，拒绝覆盖')

  const parent = path.dirname(backupPath)
  if (!existsSync(parent) || !statSync(parent).isDirectory()) {
    throw new Error('备份目录不存在')
  }

  const normalizedParent = realpathSync.native(parent)
  const normalizedBackup = path.join(normalizedParent, path.basename(backupPath))
  const resolvedNetworkReason = networkPathReason(normalizedBackup)
  if (resolvedNetworkReason) {
    throw new Error(`备份必须位于运行主机的本地持久磁盘，解析后仍为网络路径（${resolvedNetworkReason}）`)
  }
  const normalizedProject = realpathSync.native(PROJECT_ROOT)
  if (isSameOrInside(normalizedBackup, normalizedProject)) {
    throw new Error('备份必须位于项目目录之外')
  }
  if (samePath(normalizedBackup, databasePath)) {
    throw new Error('备份路径不能与数据库路径相同')
  }
  return normalizedBackup
}

function isSameOrInside(candidate: string, directory: string) {
  const relative = path.relative(directory, candidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function samePath(left: string, right: string) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase()
}

function inspectDatabase(db: Database.Database, databasePath: string): NormalizationSnapshot {
  const categories = db.prepare('SELECT id, fid FROM on_categorys ORDER BY id').all() as { id: number; fid: number | null }[]
  const links = db.prepare('SELECT id, fid FROM on_links ORDER BY id').all() as { id: number; fid: number | null }[]
  const categoryIds = new Set(categories.map((category) => category.id))
  const rootIds = new Set(categories.filter((category) => category.fid === 0).map((category) => category.id))

  const orphanCategoryCount = categories.filter(
    (category) => category.fid !== null && category.fid !== 0 && !categoryIds.has(category.fid)
  ).length
  const selfLoopCount = categories.filter((category) => category.fid === category.id).length
  const graph = analyzeCategoryGraph(categories)
  const zeroLinkCount = links.filter((link) => link.fid === 0).length
  const nullLinkCount = links.filter((link) => link.fid === null).length
  const orphanLinkCount = links.filter(
    (link) => link.fid !== null && link.fid !== 0 && !categoryIds.has(link.fid)
  ).length

  const violations = db.prepare('PRAGMA foreign_key_check').all() as {
    table: string
    rowid: number | null
    parent: string
    fkid: number
  }[]
  const unexpectedForeignKeyViolationCount = violations.filter((violation) => (
    violation.table !== 'on_categorys'
    || violation.parent !== 'on_categorys'
    || violation.rowid === null
    || !rootIds.has(violation.rowid)
  )).length

  const integrityCheck = db.pragma('integrity_check') as { integrity_check: string }[]
  if (integrityCheck.length !== 1 || integrityCheck[0]?.integrity_check !== 'ok') {
    throw new Error('PRAGMA integrity_check 未通过')
  }
  const journalMode = String(db.pragma('journal_mode', { simple: true })).toLowerCase()
  const categoryRows = selectTypedRows(db, 'SELECT * FROM on_categorys ORDER BY id')
  const linkRows = selectTypedRows(db, 'SELECT * FROM on_links ORDER BY id')
  const optionRows = selectTypedRows(db, 'SELECT * FROM on_options ORDER BY id')
  const sequenceRows = selectTypedRows(db, 'SELECT name, seq FROM sqlite_sequence ORDER BY name')
  const normalizedCategoryRows = categoryRows.map((row) => ({
    ...row,
    fid: row.fid === 0 || (typeof row.fid === 'bigint' && row.fid === BigInt(0)) ? null : row.fid,
  }))

  return {
    fileHash: sha256File(databasePath),
    journalMode,
    categoryCount: categories.length,
    linkCount: links.length,
    optionCount: countRows(db, 'on_options'),
    rootZeroCount: rootIds.size,
    rootNullCount: categories.filter((category) => category.fid === null).length,
    orphanCategoryCount,
    selfLoopCount,
    cycleCount: graph.cycleCount,
    maxDepth: graph.maxDepth,
    zeroLinkCount,
    nullLinkCount,
    orphanLinkCount,
    foreignKeyViolationCount: violations.length,
    unexpectedForeignKeyViolationCount,
    categoryIdsHash: hashRows(categories.map(({ id }) => ({ id }))),
    categoryContentHash: hashRows(categoryRows),
    categoryNormalizedContentHash: hashRows(normalizedCategoryRows),
    categoryStableHash: hashRows(db.prepare(`
      SELECT id, name, property, weight, description, font_icon, add_time, up_time
      FROM on_categorys ORDER BY id
    `).all() as Row[]),
    nonRootParentsHash: hashRows(categories
      .filter((category) => category.fid !== null && category.fid !== 0)
      .map(({ id, fid }) => ({ id, fid }))),
    linkIdsHash: hashRows(links.map(({ id }) => ({ id }))),
    linkContentHash: hashRows(linkRows),
    optionContentHash: hashRows(optionRows),
    sqliteSequenceHash: hashRows(sequenceRows),
  }
}

function analyzeCategoryGraph(categories: { id: number; fid: number | null }[]) {
  const parentById = new Map(categories.map((category) => [category.id, category.fid]))
  const cycleKeys = new Set<string>()
  let maxDepth = 0

  for (const category of categories) {
    const pathIds: number[] = []
    const position = new Map<number, number>()
    let currentId: number | null = category.id
    let depth = 0

    while (currentId !== null && currentId !== 0 && parentById.has(currentId)) {
      const cycleStart = position.get(currentId)
      if (cycleStart !== undefined) {
        const cycle = pathIds.slice(cycleStart).sort((left, right) => left - right)
        cycleKeys.add(cycle.join(','))
        break
      }
      position.set(currentId, pathIds.length)
      pathIds.push(currentId)
      depth += 1
      currentId = parentById.get(currentId) ?? null
    }
    maxDepth = Math.max(maxDepth, depth)
  }

  return { cycleCount: cycleKeys.size, maxDepth }
}

function assertSafeSource(snapshot: NormalizationSnapshot) {
  if (
    snapshot.categoryCount !== EXPECTED_COUNTS.categoryCount
    || snapshot.linkCount !== EXPECTED_COUNTS.linkCount
    || snapshot.optionCount !== EXPECTED_COUNTS.optionCount
  ) {
    throw new Error(
      `数据库基线计数不匹配，拒绝继续：期望 Category=${EXPECTED_COUNTS.categoryCount}, Link=${EXPECTED_COUNTS.linkCount}, Option=${EXPECTED_COUNTS.optionCount}, fid0 roots=${EXPECTED_COUNTS.rootCount}`
    )
  }
  const failures = [
    ['Link fid=0', snapshot.zeroLinkCount],
    ['Link fid IS NULL', snapshot.nullLinkCount],
    ['孤儿链接', snapshot.orphanLinkCount],
    ['孤儿分类', snapshot.orphanCategoryCount],
    ['分类 self-loop', snapshot.selfLoopCount],
    ['分类环', snapshot.cycleCount],
    ['意外外键违规', snapshot.unexpectedForeignKeyViolationCount],
  ].filter(([, count]) => count !== 0)
  if (snapshot.maxDepth > 2) failures.push(['超过两级的分类', snapshot.maxDepth])
  if (failures.length > 0) {
    throw new Error(`预检失败：${failures.map(([label, count]) => `${label}=${count}`).join('，')}`)
  }
  if (snapshot.rootZeroCount !== EXPECTED_COUNTS.rootCount || snapshot.rootNullCount !== 0) {
    throw new Error(`数据库根分类基线不匹配：期望 fid0=${EXPECTED_COUNTS.rootCount}, NULL=0`)
  }
  if (snapshot.foreignKeyViolationCount !== snapshot.rootZeroCount) {
    throw new Error('外键违规数量与 fid=0 根分类数量不一致')
  }
}

function assertSafeTarget(snapshot: NormalizationSnapshot) {
  if (
    snapshot.categoryCount !== EXPECTED_COUNTS.categoryCount
    || snapshot.linkCount !== EXPECTED_COUNTS.linkCount
    || snapshot.optionCount !== EXPECTED_COUNTS.optionCount
    || snapshot.rootZeroCount !== 0
    || snapshot.rootNullCount !== EXPECTED_COUNTS.rootCount
    || snapshot.orphanCategoryCount !== 0
    || snapshot.selfLoopCount !== 0
    || snapshot.cycleCount !== 0
    || snapshot.maxDepth > 2
    || snapshot.zeroLinkCount !== 0
    || snapshot.nullLinkCount !== 0
    || snapshot.orphanLinkCount !== 0
    || snapshot.foreignKeyViolationCount !== 0
  ) {
    throw new Error('目标 schema 已存在，但数据不变量或基线计数不正确')
  }
}

function rebuildCategoryTable(db: Database.Database) {
  const existingTemp = db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'on_categorys_new'").get()
  if (existingTemp) throw new Error('检测到意外的 on_categorys_new，拒绝继续')

  const sequenceRows = selectTypedRows(db, 'SELECT name, seq FROM sqlite_sequence ORDER BY name')
  db.exec(`
    CREATE TABLE "on_categorys_new" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "fid" INTEGER,
      "property" INTEGER NOT NULL DEFAULT 0,
      "weight" INTEGER NOT NULL DEFAULT 0,
      "description" TEXT NOT NULL DEFAULT '',
      "font_icon" TEXT NOT NULL DEFAULT '',
      "add_time" INTEGER NOT NULL DEFAULT 0,
      "up_time" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "on_categorys_fid_fkey" FOREIGN KEY ("fid") REFERENCES "on_categorys_new" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
    INSERT INTO "on_categorys_new" (id, name, fid, property, weight, description, font_icon, add_time, up_time)
    SELECT id, name, CASE WHEN fid = 0 THEN NULL ELSE fid END, property, weight, description, font_icon, add_time, up_time
    FROM "on_categorys" ORDER BY id;
    DROP TABLE "on_categorys";
    ALTER TABLE "on_categorys_new" RENAME TO "on_categorys";
  `)

  db.prepare('DELETE FROM sqlite_sequence').run()
  const restoreSequence = db.prepare('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)')
  for (const row of sequenceRows) restoreSequence.run(row.name, row.seq)
}

function assertMigrationResult(before: NormalizationSnapshot, after: NormalizationSnapshot) {
  if (after.categoryCount !== before.categoryCount) throw new Error('Category 数量发生变化')
  if (after.linkCount !== before.linkCount) throw new Error('Link 数量发生变化')
  if (after.optionCount !== before.optionCount) throw new Error('Option 数量发生变化')
  if (after.categoryIdsHash !== before.categoryIdsHash) throw new Error('Category ID 集合发生变化')
  if (after.linkIdsHash !== before.linkIdsHash) throw new Error('Link ID 集合发生变化')
  if (after.categoryStableHash !== before.categoryStableHash) throw new Error('Category 非 fid 字段发生变化')
  if (after.nonRootParentsHash !== before.nonRootParentsHash) throw new Error('非根分类父级发生变化')
  if (after.categoryContentHash !== before.categoryNormalizedContentHash) throw new Error('Category 全行内容不符合唯一允许的 fid 规范化')
  if (after.linkContentHash !== before.linkContentHash) throw new Error('Link 内容发生变化')
  if (after.optionContentHash !== before.optionContentHash) throw new Error('Option 内容发生变化')
  if (after.sqliteSequenceHash !== before.sqliteSequenceHash) throw new Error('sqlite_sequence 发生变化')
  if (after.rootZeroCount !== 0) throw new Error('迁移后仍存在 fid=0 分类')
  if (after.rootNullCount !== before.rootNullCount + before.rootZeroCount) throw new Error('NULL 根分类数量不符合预期')
  if (after.foreignKeyViolationCount !== 0) throw new Error('迁移后 foreign_key_check 非零')
  if (after.orphanCategoryCount !== 0 || after.selfLoopCount !== 0 || after.cycleCount !== 0) {
    throw new Error('迁移后分类图不完整')
  }
  if (after.zeroLinkCount !== 0 || after.nullLinkCount !== 0 || after.orphanLinkCount !== 0) {
    throw new Error('迁移后链接分类不完整')
  }
}

function assertLogicalSnapshotEqual(
  expected: NormalizationSnapshot,
  actual: NormalizationSnapshot,
  message: string
) {
  const keys: (keyof NormalizationSnapshot)[] = [
    'journalMode', 'categoryCount', 'linkCount', 'optionCount', 'rootZeroCount', 'rootNullCount',
    'orphanCategoryCount', 'selfLoopCount', 'cycleCount', 'maxDepth',
    'zeroLinkCount', 'nullLinkCount', 'orphanLinkCount', 'foreignKeyViolationCount',
    'unexpectedForeignKeyViolationCount', 'categoryIdsHash', 'categoryStableHash',
    'categoryContentHash', 'categoryNormalizedContentHash', 'nonRootParentsHash',
    'linkIdsHash', 'linkContentHash', 'optionContentHash', 'sqliteSequenceHash',
  ]
  for (const key of keys) {
    if (expected[key] !== actual[key]) throw new Error(`${message}：${key}`)
  }
}

function assertSchema(db: Database.Database, mode: 'source' | 'target') {
  const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[]
  const names = tableNames.map(({ name }) => name)
  for (const table of BUSINESS_TABLES) {
    if (!names.includes(table)) throw new Error(`数据库结构不符：缺少 ${table}`)
  }
  const extraBusinessTables = names.filter((name) => name !== 'sqlite_sequence' && !BUSINESS_TABLES.includes(name as typeof BUSINESS_TABLES[number]))
  if (extraBusinessTables.length > 0) throw new Error('数据库结构不符：存在意外业务表')

  assertSqliteMaster(db, mode)
  assertTableFlags(db)

  assertColumns(db, 'on_categorys', expectedCategoryColumns(mode))
  assertColumns(db, 'on_links', EXPECTED_LINK_COLUMNS)
  assertColumns(db, 'on_options', EXPECTED_OPTION_COLUMNS)
  assertForeignKey(db, 'on_categorys', 'fid', 'on_categorys', 'id')
  assertForeignKey(db, 'on_links', 'fid', 'on_categorys', 'id')

  const triggers = db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type IN ('trigger', 'view')").get() as { count: number }
  if (triggers.count !== 0) throw new Error('数据库结构不符：存在未预期的触发器或视图')

  for (const table of ['on_categorys', 'on_links']) {
    const indexes = db.prepare(`PRAGMA index_list("${table}")`).all()
    if (indexes.length !== 0) throw new Error(`数据库结构不符：${table} 存在额外索引`)
  }

  const optionIndexes = db.prepare('PRAGMA index_list("on_options")').all() as {
    seq: number
    name: string
    unique: number
    origin: string
    partial: number
  }[]
  if (optionIndexes.length !== 1) throw new Error('数据库结构不符：on_options 索引集合发生变化')
  const keyIndex = optionIndexes.find((index) => (
    index.seq === 0
    && index.name === 'on_options_key_key'
    && index.unique === 1
    && index.origin === 'c'
    && index.partial === 0
  ))
  if (!keyIndex) throw new Error('数据库结构不符：缺少 Option key 唯一索引')
  const keyColumns = db.prepare('PRAGMA index_xinfo("on_options_key_key")').all()
  const expectedKeyColumns = [
    { seqno: 0, cid: 1, name: 'key', desc: 0, coll: 'BINARY', key: 1 },
    { seqno: 1, cid: -1, name: null, desc: 0, coll: 'BINARY', key: 0 },
  ]
  if (JSON.stringify(keyColumns) !== JSON.stringify(expectedKeyColumns)) {
    throw new Error('数据库结构不符：Option index_xinfo 不匹配')
  }
}

function assertSqliteMaster(db: Database.Database, mode: 'source' | 'target') {
  const actual = db.prepare(`
    SELECT type, name, tbl_name, sql
    FROM sqlite_master
    WHERE name NOT LIKE 'sqlite_%'
    ORDER BY type, name
  `).all() as { type: string; name: string; tbl_name: string; sql: string | null }[]
  const expected = [
    { type: 'index', name: 'on_options_key_key', tbl_name: 'on_options', sql: OPTION_INDEX_SQL },
    { type: 'table', name: 'on_categorys', tbl_name: 'on_categorys', sql: mode === 'source' ? CATEGORY_SOURCE_SQL : CATEGORY_TARGET_SQL },
    { type: 'table', name: 'on_links', tbl_name: 'on_links', sql: LINK_SQL },
    { type: 'table', name: 'on_options', tbl_name: 'on_options', sql: OPTION_SQL },
  ]
  const normalizedActual = actual.map((entry) => ({ ...entry, sql: normalizeSql(entry.sql) }))
  const normalizedExpected = expected.map((entry) => ({ ...entry, sql: normalizeSql(entry.sql) }))
  if (JSON.stringify(normalizedActual) !== JSON.stringify(normalizedExpected)) {
    throw new Error('数据库 schema drift：sqlite_master CREATE SQL 不匹配')
  }
}

function normalizeSql(sql: string | null) {
  return sql?.trim().replace(/\s+/g, ' ') ?? null
}

function assertTableFlags(db: Database.Database) {
  const actual = (db.prepare('PRAGMA table_list').all() as {
    schema: string
    name: string
    type: string
    ncol: number
    wr: number
    strict: number
  }[])
    .filter((entry) => entry.schema === 'main' && BUSINESS_TABLES.includes(entry.name as typeof BUSINESS_TABLES[number]))
    .map(({ name, type, ncol, wr, strict }) => ({ name, type, ncol, wr, strict }))
    .sort((left, right) => left.name.localeCompare(right.name))
  const expected = [
    { name: 'on_categorys', type: 'table', ncol: 9, wr: 0, strict: 0 },
    { name: 'on_links', type: 'table', ncol: 14, wr: 0, strict: 0 },
    { name: 'on_options', type: 'table', ncol: 4, wr: 0, strict: 0 },
  ]
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('数据库 schema drift：table flags、STRICT 或 WITHOUT ROWID 不匹配')
  }
}

type ExpectedColumn = {
  cid: number
  name: string
  type: string
  notnull: number
  defaultValue: string | null
  pk: number
  hidden: number
}

const EXPECTED_LINK_COLUMNS: ExpectedColumn[] = [
  column('id', 'INTEGER', 1, null, 1), column('fid', 'INTEGER', 1, null, 0),
  column('title', 'TEXT', 1, null, 0), column('url', 'TEXT', 1, null, 0),
  column('url_standby', 'TEXT', 1, "''", 0), column('description', 'TEXT', 1, "''", 0),
  column('weight', 'INTEGER', 1, '0', 0), column('property', 'INTEGER', 1, '0', 0),
  column('font_icon', 'TEXT', 1, "''", 0), column('topping', 'INTEGER', 1, '0', 0),
  column('check_status', 'INTEGER', 1, '0', 0), column('last_checked_time', 'TEXT', 1, "''", 0),
  column('add_time', 'INTEGER', 1, '0', 0), column('up_time', 'INTEGER', 1, '0', 0),
]

const EXPECTED_OPTION_COLUMNS: ExpectedColumn[] = [
  column('id', 'INTEGER', 1, null, 1), column('key', 'TEXT', 1, null, 0),
  column('value', 'TEXT', 1, null, 0), column('extend', 'TEXT', 1, "''", 0),
]

function expectedCategoryColumns(mode: 'source' | 'target'): ExpectedColumn[] {
  return [
    column('id', 'INTEGER', 1, null, 1), column('name', 'TEXT', 1, null, 0),
    column('fid', 'INTEGER', mode === 'source' ? 1 : 0, mode === 'source' ? '0' : null, 0),
    column('property', 'INTEGER', 1, '0', 0), column('weight', 'INTEGER', 1, '0', 0),
    column('description', 'TEXT', 1, "''", 0), column('font_icon', 'TEXT', 1, "''", 0),
    column('add_time', 'INTEGER', 1, '0', 0), column('up_time', 'INTEGER', 1, '0', 0),
  ]
}

function column(name: string, type: string, notnull: number, defaultValue: string | null, pk: number): ExpectedColumn {
  return { cid: -1, name, type, notnull, defaultValue, pk, hidden: 0 }
}

function assertColumns(db: Database.Database, table: string, expected: ExpectedColumn[]) {
  const actual = db.prepare(`PRAGMA table_xinfo("${table}")`).all() as {
    cid: number
    name: string
    type: string
    notnull: number
    dflt_value: string | null
    pk: number
    hidden: number
  }[]
  const normalized = actual.map((entry) => ({
    cid: entry.cid,
    name: entry.name,
    type: entry.type,
    notnull: entry.notnull,
    defaultValue: entry.dflt_value,
    pk: entry.pk,
    hidden: entry.hidden,
  }))
  const expectedWithCid = expected.map((entry, cid) => ({ ...entry, cid }))
  if (JSON.stringify(normalized) !== JSON.stringify(expectedWithCid)) {
    throw new Error(`数据库结构不符：${table} 列定义不匹配`)
  }
}

function assertForeignKey(db: Database.Database, table: string, from: string, parent: string, to: string) {
  const foreignKeys = db.prepare(`PRAGMA foreign_key_list("${table}")`).all() as {
    id: number
    seq: number
    table: string
    from: string
    to: string
    on_update: string
    on_delete: string
    match: string
  }[]
  const expected = [{
    id: 0,
    seq: 0,
    table: parent,
    from,
    to,
    on_update: 'CASCADE',
    on_delete: 'RESTRICT',
    match: 'NONE',
  }]
  if (JSON.stringify(foreignKeys) !== JSON.stringify(expected)) {
    throw new Error(`数据库结构不符：${table} 外键定义不匹配`)
  }
}

function countRows(db: Database.Database, table: string) {
  return (db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number }).count
}

function hashRows(rows: Row[]) {
  const hash = createHash('sha256')
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      updateLengthPrefixed(hash, Buffer.from(key, 'utf8'))
      updateLengthPrefixed(hash, encodeTypedValue(value))
    }
    hash.update(Buffer.from([0xff]))
  }
  return hash.digest('hex')
}

function selectTypedRows(db: Database.Database, sql: string): Row[] {
  const statement = db.prepare(sql)
  statement.safeIntegers(true)
  return statement.all() as Row[]
}

function encodeTypedValue(value: Scalar) {
  if (value === null) return Buffer.from([0])
  if (typeof value === 'bigint') return Buffer.concat([Buffer.from([1]), Buffer.from(value.toString(10), 'utf8')])
  if (typeof value === 'number') {
    const bytes = Buffer.allocUnsafe(9)
    bytes[0] = 2
    bytes.writeDoubleBE(value, 1)
    return bytes
  }
  if (typeof value === 'string') return Buffer.concat([Buffer.from([3]), Buffer.from(value, 'utf8')])
  if (Buffer.isBuffer(value)) return Buffer.concat([Buffer.from([4]), value])
  throw new Error('检测到不支持的 SQLite 值类型')
}

function updateLengthPrefixed(hash: ReturnType<typeof createHash>, value: Buffer) {
  const length = Buffer.allocUnsafe(4)
  length.writeUInt32BE(value.length)
  hash.update(length)
  hash.update(value)
}

function sha256File(filePath: string) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

async function main() {
  const applyRequested = process.argv.slice(2).includes('--apply')
  try {
    const options = parseNormalizationArguments(process.argv.slice(2))
    const result = await runCategoryRootNormalization(options)
    const summary = result.after ?? result.before
    console.log(result.status)
    for (const warning of result.warnings) console.warn(`WARNING: ${warning}`)
    console.log(`database=${result.databasePath}`)
    if (result.backupPath) console.log(`backup=${result.backupPath}`)
    console.log(`before_sha256=${result.before.fileHash}`)
    console.log(`suggested_expected_sha256=${result.before.fileHash}`)
    if (result.after) console.log(`after_sha256=${result.after.fileHash}`)
    console.log(`Category=${summary.categoryCount} Link=${summary.linkCount} Option=${summary.optionCount}`)
    console.log(`Category fid=0=${summary.rootZeroCount} fid IS NULL=${summary.rootNullCount}`)
    console.log(`foreign_key_check=${summary.foreignKeyViolationCount}`)
  } catch (error) {
    if (error instanceof NormalizationFailure) {
      console.error(error.state)
      console.error(error.message)
      if (error.backupPath) console.error(`verified_backup=${error.backupPath}`)
      if (error.state === 'COMMITTED_VERIFY_FAILED') {
        console.error('禁止自动重试或自动恢复；数据库可能已提交，必须人工检查。')
      }
      process.exitCode = error.exitCode
    } else {
      if (applyRequested) console.error('NOT_COMMITTED')
      console.error(error instanceof Error ? error.message : '迁移失败')
      process.exitCode = 1
    }
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (invokedPath === import.meta.url) void main()
