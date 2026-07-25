import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test, { type TestContext } from 'node:test'

import Database from 'better-sqlite3'

import {
  NormalizationFailure,
  parseNormalizationArguments,
  runCategoryRootNormalization,
} from '../scripts/normalize-category-roots'

test('dry-run validates roots without changing the database file', async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'lune-roots-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const databasePath = path.join(directory, 'fixture.db')
  createFixture(databasePath)
  const beforeHash = sha256(databasePath)

  const result = await runCategoryRootNormalization({ databasePath, apply: false })

  assert.equal(result.status, 'DRY_RUN_READY')
  assert.equal(result.before.categoryCount, 59)
  assert.equal(result.before.rootZeroCount, 16)
  assert.equal(sha256(databasePath), beforeHash)
})

test('apply converts zero roots to null while preserving IDs and content', async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'lune-roots-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const databasePath = path.join(directory, 'fixture.db')
  const backupPath = path.join(directory, 'fixture.backup.db')
  createFixture(databasePath)
  const before = readFixtureState(databasePath)

  const result = await runCategoryRootNormalization({
    databasePath,
    apply: true,
    backupPath,
    expectedSha256: sha256(databasePath),
  })

  const after = readFixtureState(databasePath)
  assert.equal(result.status, 'COMMITTED_AND_VERIFIED')
  assert.equal(result.after?.rootZeroCount, 0)
  assert.equal(result.after?.rootNullCount, 16)
  assert.deepEqual(after.categoryIds, before.categoryIds)
  assert.deepEqual(after.linkIds, before.linkIds)
  assert.equal(after.optionHash, before.optionHash)
  assert.equal(after.categoryHash, before.normalizedCategoryHash)
  assert.equal(after.linkHash, before.linkHash)
  assert.equal(after.sequenceHash, before.sequenceHash)
  assert.equal(after.categoryCount, before.categoryCount)
  assert.equal(after.linkCount, before.linkCount)
  assert.equal(after.optionCount, before.optionCount)
  assert.equal(after.foreignKeyViolations, 0)
  assert.equal(existsSync(backupPath), true)
})

test('reports ALREADY_MIGRATED without rebuilding a valid target database', async (t) => {
  const { directory, databasePath } = createTemporaryFixture(t, 'already')
  const firstBackup = path.join(directory, 'first.backup.db')
  await runCategoryRootNormalization({
    databasePath,
    apply: true,
    backupPath: firstBackup,
    expectedSha256: sha256(databasePath),
  })
  const migratedHash = sha256(databasePath)

  const result = await runCategoryRootNormalization({ databasePath, apply: false })

  assert.equal(result.status, 'ALREADY_MIGRATED')
  assert.equal(sha256(databasePath), migratedHash)

  const unusedBackup = path.join(directory, 'unused-second.backup.db')
  const applyResult = await runCategoryRootNormalization({
    databasePath,
    apply: true,
    backupPath: unusedBackup,
    expectedSha256: migratedHash,
  })
  assert.equal(applyResult.status, 'ALREADY_MIGRATED')
  assert.equal(existsSync(unusedBackup), false)
  assert.equal(sha256(databasePath), migratedHash)
})

test('apply requires an explicit backup path', () => {
  assert.throws(
    () => parseNormalizationArguments(['--database', path.join(tmpdir(), 'fixture.db'), '--apply']),
    /--backup/
  )
})

test('apply requires an explicit expected SHA-256', () => {
  assert.throws(
    () => parseNormalizationArguments([
      '--database', path.join(tmpdir(), 'fixture.db'),
      '--apply',
      '--backup', path.join(tmpdir(), 'fixture.backup.db'),
    ]),
    /--expected-sha256/
  )
  assert.throws(
    () => parseNormalizationArguments([
      '--database', path.join(tmpdir(), 'fixture.db'),
      '--apply',
      '--backup', path.join(tmpdir(), 'fixture.backup.db'),
      '--expected-sha256', 'not-a-sha',
    ]),
    /64 位十六进制/
  )
})

test('apply rejects a database whose SHA-256 does not match', async (t) => {
  const { directory, databasePath } = createTemporaryFixture(t)
  const backupPath = path.join(directory, 'fixture.backup.db')
  const beforeHash = sha256(databasePath)

  await assert.rejects(
    runCategoryRootNormalization({
      databasePath,
      apply: true,
      backupPath,
      expectedSha256: '0'.repeat(64),
    }),
    /SHA-256/
  )
  assert.equal(sha256(databasePath), beforeHash)
  assert.equal(existsSync(backupPath), false)
})

test('apply rejects UNC database paths before opening them', async () => {
  await assert.rejects(
    runCategoryRootNormalization({
      databasePath: '\\\\server\\share\\onenav.db',
      apply: true,
      backupPath: path.join(tmpdir(), `unc-backup-${Date.now()}.db`),
      expectedSha256: '0'.repeat(64),
    }),
    /本地持久磁盘|网络路径/
  )
})

test('apply rejects the known S mapped network drive before opening it', async () => {
  await assert.rejects(
    runCategoryRootNormalization({
      databasePath: 'S:\\not-opened-by-test\\onenav.db',
      apply: true,
      backupPath: path.join(tmpdir(), `mapped-backup-${Date.now()}.db`),
      expectedSha256: '0'.repeat(64),
    }),
    /本地持久磁盘|网络路径/
  )
})

test('rejects an empty lookalike database instead of treating it as the activity database', async (t) => {
  const { databasePath } = createTemporaryFixture(t, 'empty')
  mutateFixture(databasePath, 'DELETE FROM on_links; DELETE FROM on_categorys; DELETE FROM on_options;')

  await assert.rejects(
    runCategoryRootNormalization({ databasePath, apply: false }),
    /基线计数|59|534|第二份空库/
  )
})

test('apply rejects WAL or SHM sidecars without changing the database', async (t) => {
  for (const suffix of ['-wal', '-shm']) {
    const fixture = createTemporaryFixture(t, suffix.slice(1))
    const backupPath = path.join(fixture.directory, 'backup.db')
    const beforeHash = sha256(fixture.databasePath)
    writeFileSync(`${fixture.databasePath}${suffix}`, 'unexpected-sidecar')

    await assert.rejects(
      runCategoryRootNormalization({
        databasePath: fixture.databasePath,
        apply: true,
        backupPath,
        expectedSha256: beforeHash,
      }),
      /-wal|-shm|sidecar/i
    )
    assert.equal(sha256(fixture.databasePath), beforeHash)
    assert.equal(existsSync(backupPath), false)
  }
})

test('apply rejects a non-DELETE journal mode', async (t) => {
  const { directory, databasePath } = createTemporaryFixture(t, 'wal-mode')
  const db = new Database(databasePath)
  db.pragma('journal_mode = WAL')
  db.close()
  const beforeHash = sha256(databasePath)

  await assert.rejects(
    runCategoryRootNormalization({
      databasePath,
      apply: true,
      backupPath: path.join(directory, 'backup.db'),
      expectedSha256: beforeHash,
    }),
    /journal_mode|DELETE/i
  )
  assert.equal(sha256(databasePath), beforeHash)
})

test('dry-run aborts on an orphan link and unexpected foreign-key violation', async (t) => {
  const { databasePath } = createTemporaryFixture(t)
  mutateFixture(databasePath, 'UPDATE on_links SET fid = 999 WHERE id = 1')
  await assert.rejects(
    runCategoryRootNormalization({ databasePath, apply: false }),
    /孤儿链接|意外外键违规/
  )
})

test('dry-run aborts when a link uses fid zero', async (t) => {
  const { databasePath } = createTemporaryFixture(t)
  mutateFixture(databasePath, 'UPDATE on_links SET fid = 0 WHERE id = 1')
  await assert.rejects(
    runCategoryRootNormalization({ databasePath, apply: false }),
    /Link fid=0/
  )
})

test('dry-run aborts on an orphan category', async (t) => {
  const { databasePath } = createTemporaryFixture(t)
  mutateFixture(databasePath, 'UPDATE on_categorys SET fid = 999 WHERE id = 17')
  await assert.rejects(
    runCategoryRootNormalization({ databasePath, apply: false }),
    /孤儿分类/
  )
})

test('dry-run aborts on category cycles and self-loops', async (t) => {
  const cyclic = createTemporaryFixture(t, 'cycle')
  mutateFixture(cyclic.databasePath, 'UPDATE on_categorys SET fid = CASE id WHEN 1 THEN 2 WHEN 2 THEN 1 ELSE fid END')
  await assert.rejects(
    runCategoryRootNormalization({ databasePath: cyclic.databasePath, apply: false }),
    /分类环/
  )

  const selfLoop = createTemporaryFixture(t, 'self')
  mutateFixture(selfLoop.databasePath, 'UPDATE on_categorys SET fid = id WHERE id = 1')
  await assert.rejects(
    runCategoryRootNormalization({ databasePath: selfLoop.databasePath, apply: false }),
    /self-loop/
  )
})

test('dry-run rejects an unexpected database structure', async (t) => {
  const { databasePath } = createTemporaryFixture(t)
  mutateFixture(databasePath, 'DROP INDEX on_options_key_key')
  await assert.rejects(
    runCategoryRootNormalization({ databasePath, apply: false }),
    /唯一索引|索引集合|schema drift/
  )
})

test('dry-run rejects extra indexes that would be lost during table rebuild', async (t) => {
  const { databasePath } = createTemporaryFixture(t, 'extra-index')
  mutateFixture(databasePath, 'CREATE INDEX unexpected_category_index ON on_categorys(weight)')

  await assert.rejects(
    runCategoryRootNormalization({ databasePath, apply: false }),
    /索引|schema|结构/i
  )
})

test('dry-run rejects extra columns, generated columns, CHECK constraints, triggers, and views', async (t) => {
  const cases: { suffix: string; mutate: (databasePath: string) => void }[] = [
    { suffix: 'extra-column', mutate: (databasePath) => mutateFixture(databasePath, 'ALTER TABLE on_categorys ADD COLUMN extra_column TEXT') },
    { suffix: 'generated', mutate: (databasePath) => rebuildCategoryWithDrift(databasePath, '"generated_name" TEXT GENERATED ALWAYS AS ("name") VIRTUAL,') },
    { suffix: 'check', mutate: (databasePath) => rebuildCategoryWithDrift(databasePath, 'CHECK ("weight" >= 0),') },
    { suffix: 'trigger', mutate: (databasePath) => mutateFixture(databasePath, 'CREATE TRIGGER unexpected_trigger AFTER UPDATE ON on_categorys BEGIN SELECT 1; END') },
    { suffix: 'view', mutate: (databasePath) => mutateFixture(databasePath, 'CREATE VIEW unexpected_view AS SELECT id FROM on_categorys') },
  ]

  for (const driftCase of cases) {
    const { databasePath } = createTemporaryFixture(t, driftCase.suffix)
    driftCase.mutate(databasePath)
    await assert.rejects(
      runCategoryRootNormalization({ databasePath, apply: false }),
      /schema|结构|列定义|触发器|视图|CHECK|生成列/i,
      driftCase.suffix
    )
  }
})

test('apply refuses to place a backup inside the project directory', async (t) => {
  const { databasePath } = createTemporaryFixture(t)
  const projectBackup = path.resolve('prisma', `forbidden-backup-${Date.now()}.db`)
  await assert.rejects(
    runCategoryRootNormalization({
      databasePath,
      apply: true,
      backupPath: projectBackup,
      expectedSha256: sha256(databasePath),
    }),
    /项目目录之外|本地持久磁盘|网络路径/
  )
  assert.equal(existsSync(projectBackup), false)
})

test('apply refuses UNC and known mapped-drive backup paths', async (t) => {
  const { databasePath } = createTemporaryFixture(t, 'network-backup')
  for (const backupPath of ['\\\\server\\share\\backup.db', 'S:\\backup-not-opened-by-test.db']) {
    await assert.rejects(
      runCategoryRootNormalization({
        databasePath,
        apply: true,
        backupPath,
        expectedSha256: sha256(databasePath),
      }),
      /备份.*本地|网络路径|本地持久磁盘/i
    )
  }
})

test('backup deadline failure leaves the database unchanged and unpublished', async (t) => {
  const { directory, databasePath } = createTemporaryFixture(t, 'backup-timeout')
  const backupPath = path.join(directory, 'backup.db')
  const beforeHash = sha256(databasePath)

  await assert.rejects(
    runCategoryRootNormalization({
      databasePath,
      apply: true,
      backupPath,
      expectedSha256: beforeHash,
      backupDeadlineMs: 0,
    }),
    /backup|备份|deadline|超时/i
  )
  assert.equal(sha256(databasePath), beforeHash)
  assert.equal(existsSync(backupPath), false)
  assert.equal(readdirSync(directory).some((name) => name.includes('.partial-')), false)
})

test('backup content mismatch prevents the write transaction', async (t) => {
  const { directory, databasePath } = createTemporaryFixture(t, 'backup-mismatch')
  const backupPath = path.join(directory, 'backup.db')
  const beforeHash = sha256(databasePath)

  await assert.rejects(
    runCategoryRootNormalization({
      databasePath,
      apply: true,
      backupPath,
      expectedSha256: beforeHash,
      testHooks: {
        backup: async (sourceDb, temporaryPath) => {
          await sourceDb.backup(temporaryPath)
          mutateFixture(temporaryPath, "UPDATE on_options SET value = 'changed' WHERE id = 1")
        },
      },
    }),
    /备份内容|不一致/
  )
  assert.equal(sha256(databasePath), beforeHash)
  assert.equal(existsSync(backupPath), false)
})

test('backup publication failure never overwrites the occupied destination', async (t) => {
  const { directory, databasePath } = createTemporaryFixture(t, 'backup-publish')
  const backupPath = path.join(directory, 'backup.db')
  const beforeHash = sha256(databasePath)

  await assert.rejects(
    runCategoryRootNormalization({
      databasePath,
      apply: true,
      backupPath,
      expectedSha256: beforeHash,
      testHooks: {
        beforeBackupPublish: () => writeFileSync(backupPath, 'occupied'),
      },
    }),
    /EEXIST|存在|发布/i
  )
  assert.equal(readFileSync(backupPath, 'utf8'), 'occupied')
  assert.equal(sha256(databasePath), beforeHash)
  assert.equal(readdirSync(directory).some((name) => name.includes('.partial-')), false)
})

test('apply fails within the configured timeout when another writer holds the database', async (t) => {
  const { directory, databasePath } = createTemporaryFixture(t, 'busy')
  const beforeHash = sha256(databasePath)
  const lockDb = new Database(databasePath)
  const startedAt = Date.now()
  try {
    await assert.rejects(
      runCategoryRootNormalization({
        databasePath,
        apply: true,
        backupPath: path.join(directory, 'backup.db'),
        expectedSha256: beforeHash,
        busyTimeoutMs: 100,
        testHooks: {
          beforeBackupPublish: () => lockDb.exec('BEGIN IMMEDIATE'),
        },
      }),
      /SQLITE_BUSY|locked|锁|NOT_COMMITTED/i
    )
  } finally {
    if (lockDb.inTransaction) lockDb.exec('ROLLBACK')
    lockDb.close()
  }
  assert.ok(Date.now() - startedAt < 2_000)
  assert.equal(sha256(databasePath), beforeHash)
})

test('a pre-COMMIT failure rolls back and reports NOT_COMMITTED', async (t) => {
  const { directory, databasePath } = createTemporaryFixture(t, 'pre-commit')
  const backupPath = path.join(directory, 'backup.db')
  const beforeHash = sha256(databasePath)
  let failure: unknown

  try {
    await runCategoryRootNormalization({
      databasePath,
      apply: true,
      backupPath,
      expectedSha256: beforeHash,
      testHooks: { beforeCommit: () => { throw new Error('simulated pre-commit failure') } },
    })
  } catch (error) {
    failure = error
  }

  assert.ok(failure instanceof NormalizationFailure)
  assert.equal(failure.state, 'NOT_COMMITTED')
  assert.equal(failure.exitCode, 1)
  assert.equal(failure.committed, false)
  assert.equal(failure.backupPath, backupPath)
  assert.equal(sha256(databasePath), beforeHash)
  assert.equal(existsSync(backupPath), true)
})

test('a post-COMMIT verification failure reports COMMITTED_VERIFY_FAILED', async (t) => {
  const { directory, databasePath } = createTemporaryFixture(t, 'post-commit')
  const backupPath = path.join(directory, 'backup.db')
  const beforeHash = sha256(databasePath)
  let failure: unknown

  try {
    await runCategoryRootNormalization({
      databasePath,
      apply: true,
      backupPath,
      expectedSha256: beforeHash,
      testHooks: { afterCommit: () => { throw new Error('simulated post-commit verification failure') } },
    })
  } catch (error) {
    failure = error
  }

  assert.ok(failure instanceof NormalizationFailure)
  assert.equal(failure.state, 'COMMITTED_VERIFY_FAILED')
  assert.equal(failure.exitCode, 2)
  assert.equal(failure.committed, true)
  assert.equal(failure.backupPath, backupPath)
  assert.notEqual(sha256(databasePath), beforeHash)
  assert.equal(readFixtureState(databasePath).foreignKeyViolations, 0)
  assert.equal(existsSync(backupPath), true)
})

function createFixture(databasePath: string) {
  const db = new Database(databasePath)
  db.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE "on_categorys" (
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
    );
    CREATE TABLE "on_links" (
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
    );
    CREATE TABLE "on_options" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "key" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "extend" TEXT NOT NULL DEFAULT ''
    );
    CREATE UNIQUE INDEX "on_options_key_key" ON "on_options"("key");
  `)

  const insertCategory = db.prepare(`
    INSERT INTO on_categorys (id, name, fid, property, weight, description, font_icon, add_time, up_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertLink = db.prepare(`
    INSERT INTO on_links (
      id, fid, title, url, url_standby, description, weight, property, font_icon,
      topping, check_status, last_checked_time, add_time, up_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertOption = db.prepare('INSERT INTO on_options (id, key, value, extend) VALUES (?, ?, ?, ?)')
  const seed = db.transaction(() => {
    for (let id = 1; id <= 16; id += 1) {
      insertCategory.run(id, `root-${id}`, 0, id % 2, id, `root-description-${id}`, `icon-${id}`, 1000 + id, 2000 + id)
    }
    for (let id = 17; id <= 59; id += 1) {
      const parentId = ((id - 17) % 16) + 1
      insertCategory.run(id, `child-${id}`, parentId, id % 2, id, `child-description-${id}`, `icon-${id}`, 1000 + id, 2000 + id)
    }
    for (let id = 1; id <= 534; id += 1) {
      insertLink.run(
        id, ((id - 1) % 59) + 1, `title-${id}`, `https://example.invalid/${id}`,
        `https://standby.invalid/${id}`, `description-${id}`, id, id % 2, `icon-${id}`,
        id % 3, id % 4, `checked-${id}`, 3000 + id, 4000 + id
      )
    }
    for (let id = 1; id <= 7; id += 1) {
      insertOption.run(id, `setting-${id}`, id === 7 ? Buffer.from([0, 255, 1]) : `value-${id}`, `extend-${id}`)
    }
  })
  seed()
  db.prepare("UPDATE sqlite_sequence SET seq = 121 WHERE name = 'on_categorys'").run()
  db.prepare("UPDATE sqlite_sequence SET seq = 704 WHERE name = 'on_links'").run()
  db.prepare("UPDATE sqlite_sequence SET seq = 9 WHERE name = 'on_options'").run()
  db.close()
}

function createTemporaryFixture(t: TestContext, suffix = 'fixture') {
  const directory = mkdtempSync(path.join(tmpdir(), `lune-roots-${suffix}-`))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const databasePath = path.join(directory, 'fixture.db')
  createFixture(databasePath)
  return { directory, databasePath }
}

function mutateFixture(databasePath: string, sql: string) {
  const db = new Database(databasePath)
  try {
    db.pragma('foreign_keys = OFF')
    db.exec(sql)
  } finally {
    db.close()
  }
}

function rebuildCategoryWithDrift(databasePath: string, extraDefinition: string) {
  const db = new Database(databasePath)
  try {
    db.pragma('foreign_keys = OFF')
    db.exec(`
      CREATE TABLE "on_categorys_drift" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "fid" INTEGER NOT NULL DEFAULT 0,
        "property" INTEGER NOT NULL DEFAULT 0,
        "weight" INTEGER NOT NULL DEFAULT 0,
        "description" TEXT NOT NULL DEFAULT '',
        "font_icon" TEXT NOT NULL DEFAULT '',
        "add_time" INTEGER NOT NULL DEFAULT 0,
        "up_time" INTEGER NOT NULL DEFAULT 0,
        ${extraDefinition}
        CONSTRAINT "on_categorys_fid_fkey" FOREIGN KEY ("fid") REFERENCES "on_categorys_drift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      INSERT INTO "on_categorys_drift" (id, name, fid, property, weight, description, font_icon, add_time, up_time)
      SELECT id, name, fid, property, weight, description, font_icon, add_time, up_time FROM "on_categorys";
      DROP TABLE "on_categorys";
      ALTER TABLE "on_categorys_drift" RENAME TO "on_categorys";
    `)
  } finally {
    db.close()
  }
}

function sha256(filePath: string) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function readFixtureState(databasePath: string) {
  const db = new Database(databasePath, { readonly: true, fileMustExist: true })
  try {
    const categoryIds = db.prepare('SELECT id FROM on_categorys ORDER BY id').all().map((row) => (row as { id: number }).id)
    const linkIds = db.prepare('SELECT id FROM on_links ORDER BY id').all().map((row) => (row as { id: number }).id)
    const categories = db.prepare('SELECT * FROM on_categorys ORDER BY id').all() as Record<string, unknown>[]
    const links = db.prepare('SELECT * FROM on_links ORDER BY id').all()
    const options = db.prepare('SELECT * FROM on_options ORDER BY id').all()
    const sequence = db.prepare('SELECT name, seq FROM sqlite_sequence ORDER BY name').all()
    const normalizedCategories = categories.map((category) => ({
      ...category,
      fid: category.fid === 0 ? null : category.fid,
    }))
    return {
      categoryIds,
      linkIds,
      categoryCount: categoryIds.length,
      linkCount: linkIds.length,
      optionCount: options.length,
      optionHash: createHash('sha256').update(JSON.stringify(options)).digest('hex'),
      categoryHash: createHash('sha256').update(JSON.stringify(categories)).digest('hex'),
      normalizedCategoryHash: createHash('sha256').update(JSON.stringify(normalizedCategories)).digest('hex'),
      linkHash: createHash('sha256').update(JSON.stringify(links)).digest('hex'),
      sequenceHash: createHash('sha256').update(JSON.stringify(sequence)).digest('hex'),
      foreignKeyViolations: db.prepare('PRAGMA foreign_key_check').all().length,
    }
  } finally {
    db.close()
  }
}
