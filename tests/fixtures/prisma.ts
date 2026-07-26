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

export const prisma = {
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
}

export function resetPrismaCalls() {
  calls.length = 0
}

export function getPrismaCalls() {
  return [...calls]
}
