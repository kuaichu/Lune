const calls: string[] = []

function record(name: string) {
  calls.push(name)
}

const category = {
  id: 1,
  name: 'General',
  parentId: null,
  property: 0,
  weight: 0,
  description: '',
  fontIcon: '',
  addTime: 0,
  upTime: 0,
}

const link = {
  id: 1,
  title: 'Example',
  url: 'https://example.com/',
  categoryId: 1,
  description: '',
  weight: 0,
  property: 0,
  urlStandby: '',
  fontIcon: '',
  addTime: 0,
  upTime: 0,
}

// ---------------------------------------------------------------------------
// Optional in-memory relational store.
//
// The canned client above stays the default so the existing authentication and
// handler-shape tests keep their lenient behaviour. Installing a store swaps in
// a real two-table store that enforces the `Restrict` foreign keys of
// prisma/schema.prisma and gives `$transaction` true snapshot / commit /
// rollback semantics, so data-integrity tests can assert on state instead of on
// how many mocks were touched.
// ---------------------------------------------------------------------------

export type StoreCategory = {
  id: number
  name: string
  parentId: number | null
  property?: number
  weight?: number
  description?: string
  fontIcon?: string
  addTime?: number
  upTime?: number
}

export type StoreLink = {
  id: number
  categoryId: number
  title: string
  url?: string
  urlStandby?: string
  description?: string
  weight?: number
  property?: number
  fontIcon?: string
  addTime?: number
  upTime?: number
}

type StoreState = {
  categories: StoreCategory[]
  links: StoreLink[]
}

type StoreHooks = {
  /** Invoked before every store operation; throw to inject a failure. */
  beforeOperation?: (operation: string, state: StoreState) => void
}

let store: StoreState | null = null
let hooks: StoreHooks = {}

const clone = (state: StoreState): StoreState => ({
  categories: state.categories.map((row) => ({ ...row })),
  links: state.links.map((row) => ({ ...row })),
})

export function installPrismaStore(seed: StoreState) {
  store = clone(seed)
  hooks = {}
}

export function uninstallPrismaStore() {
  store = null
  hooks = {}
}

export function setPrismaStoreHooks(next: StoreHooks) {
  hooks = next
}

/** Snapshot of the committed state, for before/after comparison in tests. */
export function readPrismaStore(): StoreState {
  if (!store) throw new Error('prisma store is not installed')
  return clone(store)
}

type ScalarFilter = number | null | { in: number[] }

function matches(value: number | null, filter: ScalarFilter | undefined): boolean {
  if (filter === undefined) return true
  if (filter !== null && typeof filter === 'object') {
    return value !== null && filter.in.includes(value)
  }
  return value === filter
}

type CategoryWhere = { id?: ScalarFilter; parentId?: ScalarFilter; property?: ScalarFilter }
type LinkWhere = { id?: ScalarFilter; categoryId?: ScalarFilter; property?: ScalarFilter }

const categoryMatches = (row: StoreCategory, where: CategoryWhere = {}) =>
  matches(row.id, where.id) &&
  matches(row.parentId, where.parentId) &&
  matches(row.property ?? 0, where.property)

const linkMatches = (row: StoreLink, where: LinkWhere = {}) =>
  matches(row.id, where.id) &&
  matches(row.categoryId, where.categoryId) &&
  matches(row.property ?? 0, where.property)

/** Shaped like Prisma's PrismaClientKnownRequestError: a stable string `code`. */
export class StoreRecordNotFound extends Error {
  code = 'P2025'
}

export class StoreForeignKeyViolation extends Error {
  code = 'P2003'
}

function storeClient(state: StoreState) {
  const enter = (operation: string) => {
    record(operation)
    hooks.beforeOperation?.(operation, state)
  }

  return {
    category: {
      async findMany({ where }: { where?: CategoryWhere } = {}) {
        enter('category.findMany')
        return state.categories.filter((row) => categoryMatches(row, where)).map((row) => ({ ...row }))
      },
      async findUnique({ where }: { where: CategoryWhere }) {
        enter('category.findUnique')
        const found = state.categories.find((row) => categoryMatches(row, where))
        return found ? { ...found } : null
      },
      async count({ where }: { where?: CategoryWhere } = {}) {
        enter('category.count')
        return state.categories.filter((row) => categoryMatches(row, where)).length
      },
      async create({ data }: { data: StoreCategory }) {
        enter('category.create')
        const created = { ...data }
        state.categories.push(created)
        return { ...created }
      },
      async update({ where, data }: { where: CategoryWhere; data: Partial<StoreCategory> }) {
        enter('category.update')
        const found = state.categories.find((row) => categoryMatches(row, where))
        if (!found) throw new StoreRecordNotFound('category not found')
        Object.assign(found, data)
        return { ...found }
      },
      async delete({ where }: { where: CategoryWhere }) {
        enter('category.delete')
        const index = state.categories.findIndex((row) => categoryMatches(row, where))
        if (index === -1) throw new StoreRecordNotFound('category not found')
        const target = state.categories[index]
        assertCategoryDeletable(state, target.id)
        state.categories.splice(index, 1)
        return { ...target }
      },
      async deleteMany({ where }: { where?: CategoryWhere } = {}) {
        enter('category.deleteMany')
        const doomed = state.categories.filter((row) => categoryMatches(row, where))
        for (const row of doomed) assertCategoryDeletable(state, row.id, doomed)
        state.categories = state.categories.filter((row) => !doomed.includes(row))
        return { count: doomed.length }
      },
    },
    link: {
      async findMany({ where }: { where?: LinkWhere } = {}) {
        enter('link.findMany')
        return state.links.filter((row) => linkMatches(row, where)).map((row) => ({ ...row }))
      },
      async findUnique({ where }: { where: LinkWhere }) {
        enter('link.findUnique')
        const found = state.links.find((row) => linkMatches(row, where))
        return found ? { ...found } : null
      },
      async count({ where }: { where?: LinkWhere } = {}) {
        enter('link.count')
        return state.links.filter((row) => linkMatches(row, where)).length
      },
      async create({ data }: { data: StoreLink }) {
        enter('link.create')
        const created = { ...data }
        state.links.push(created)
        return { ...created }
      },
      async delete({ where }: { where: LinkWhere }) {
        enter('link.delete')
        const index = state.links.findIndex((row) => linkMatches(row, where))
        if (index === -1) throw new StoreRecordNotFound('link not found')
        const [removed] = state.links.splice(index, 1)
        return { ...removed }
      },
      async deleteMany({ where }: { where?: LinkWhere } = {}) {
        enter('link.deleteMany')
        const before = state.links.length
        state.links = state.links.filter((row) => !linkMatches(row, where))
        return { count: before - state.links.length }
      },
    },
  }
}

/** Mirrors `onDelete: Restrict` on both Link.category and Category.parent. */
function assertCategoryDeletable(state: StoreState, id: number, alsoRemoved: StoreCategory[] = []) {
  if (state.links.some((row) => row.categoryId === id)) {
    throw new StoreForeignKeyViolation('links still reference this category')
  }
  const survivingChild = state.categories.some(
    (row) => row.parentId === id && !alsoRemoved.includes(row)
  )
  if (survivingChild) {
    throw new StoreForeignKeyViolation('child categories still reference this category')
  }
}

const cannedClient = {
  category: {
    async findMany() {
      record('category.findMany')
      return []
    },
    async findUnique() {
      record('category.findUnique')
      return category
    },
    async count() {
      record('category.count')
      return 0
    },
    async create() {
      record('category.create')
      return category
    },
    async update() {
      record('category.update')
      return category
    },
    async delete() {
      record('category.delete')
      return category
    },
    async deleteMany() {
      record('category.deleteMany')
      return { count: 0 }
    },
  },
  link: {
    async findMany() {
      record('link.findMany')
      return []
    },
    async findUnique() {
      record('link.findUnique')
      return link
    },
    async count() {
      record('link.count')
      return 0
    },
    async create() {
      record('link.create')
      return link
    },
    async update() {
      record('link.update')
      return link
    },
    async delete() {
      record('link.delete')
      return link
    },
    async deleteMany() {
      record('link.deleteMany')
      return { count: 0 }
    },
  },
}

function activeClient() {
  return store ? storeClient(store) : cannedClient
}

export const prisma = {
  get category() {
    return activeClient().category
  },
  get link() {
    return activeClient().link
  },
  option: {
    async findUnique() {
      record('option.findUnique')
      return null
    },
    async upsert() {
      record('option.upsert')
      return { key: 's_site', value: '{}' }
    },
  },
  /**
   * Interactive transaction. With a store installed the callback runs against a
   * working copy: it is published only when the callback resolves, and the
   * pre-transaction snapshot is restored when it rejects.
   */
  async $transaction<T>(fn: (tx: ReturnType<typeof activeClient>) => Promise<T>): Promise<T> {
    record('$transaction')
    if (!store) {
      return fn(cannedClient)
    }

    const snapshot = clone(store)
    const working = clone(store)
    try {
      const result = await fn(storeClient(working))
      store = working
      return result
    } catch (error) {
      store = snapshot
      throw error
    }
  },
}

export function resetPrismaCalls() {
  calls.length = 0
}

export function getPrismaCalls() {
  return [...calls]
}
