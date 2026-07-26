import Link from 'next/link'
import {
  BookmarkPlus,
  FolderOpen,
  Import,
  Link as LinkIcon,
  List,
  LockKeyhole,
  Settings,
  ShieldCheck,
  Sparkle,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdminPageSession } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  await requireAdminPageSession()

  const [categoryCount, linkCount, privateLinkCount, childCategoryCount, recentLinks, categories] =
    await Promise.all([
      prisma.category.count(),
      prisma.link.count(),
      prisma.link.count({ where: { property: 1 } }),
      prisma.category.count({ where: { parentId: { not: null } } }),
      prisma.link.findMany({
        orderBy: [{ addTime: 'desc' }, { id: 'desc' }],
        take: 5,
        include: { category: { select: { name: true } } },
      }),
      prisma.category.findMany({
        include: { _count: { select: { links: true } } },
      }),
    ])

  const topCategories = categories
    .sort((a, b) => b._count.links - a._count.links)
    .slice(0, 5)

  const statCards = [
    {
      href: '/admin/categories',
      icon: FolderOpen,
      label: '分类数量',
      value: categoryCount,
      hint: '全部分类',
    },
    {
      href: '/admin/links',
      icon: LinkIcon,
      label: '链接数量',
      value: linkCount,
      hint: '全部链接',
    },
    {
      href: '/admin/categories',
      icon: List,
      label: '二级分类',
      value: childCategoryCount,
      hint: '层级导航',
    },
    {
      href: '/admin/links',
      icon: LockKeyhole,
      label: '私有链接',
      value: privateLinkCount,
      hint: '仅登录可见',
    },
  ]

  const quickActions = [
    { href: '/admin/links', icon: BookmarkPlus, label: '添加链接' },
    { href: '/admin/categories', icon: FolderOpen, label: '添加分类' },
    { href: '/admin/import', icon: Import, label: '导入书签' },
    { href: '/admin/links', icon: List, label: '链接列表' },
    { href: '/admin/categories', icon: FolderOpen, label: '分类列表' },
    { href: '/admin/settings/site', icon: Settings, label: '站点设置' },
  ]

  return (
    <div className="relative min-h-[calc(100vh-78px)] overflow-hidden px-8 pb-12 pt-10 max-md:px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_8%,rgba(178,154,255,0.18),transparent_30%),radial-gradient(circle_at_76%_42%,rgba(214,204,255,0.20),transparent_34%)]" />

      <div className="relative mx-auto max-w-[1420px]">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ebe7f8] bg-white/58 px-3 py-1.5 text-xs font-bold text-[#827ab5] shadow-[0_10px_24px_rgba(77,68,124,0.04)]">
            <Sparkle className="h-3.5 w-3.5 text-[#7b68ff]" />
            Lune Control
          </div>
          <h1 className="mt-5 text-[30px] font-extrabold leading-tight text-[#10133e]">
            欢迎回来，Admin
          </h1>
          <p className="mt-2 text-[15px] font-semibold text-[#858caf]">
            管理你的 Lune 书签空间
          </p>
        </header>

        <section className="mb-6 grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group flex min-h-[138px] items-center gap-5 rounded-[16px] border border-white/78 bg-white/72 p-6 text-inherit shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#ded6ff] hover:shadow-[0_22px_52px_rgba(111,96,255,0.12)]"
            >
              <span className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f0ebff] to-[#e4dcff] text-[#705cff] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                <stat.icon className="h-8 w-8" strokeWidth={1.9} />
              </span>
              <span>
                <span className="block text-[14px] font-bold text-[#687195]">{stat.label}</span>
                <strong className="mt-1 block text-[34px] font-extrabold leading-none text-[#121642]">
                  {stat.value}
                </strong>
                <span className="mt-3 block text-[13px] font-semibold text-[#8b92b0]">{stat.hint}</span>
              </span>
            </Link>
          ))}
        </section>

        <section className="mb-6 rounded-[18px] border border-white/78 bg-white/72 p-6 shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl">
          <h2 className="mb-5 text-[17px] font-extrabold text-[#121642]">快捷操作</h2>
          <div className="grid grid-cols-6 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group flex h-[66px] items-center justify-center gap-3 rounded-[14px] border border-[#ebe7f8] bg-gradient-to-br from-white/86 to-[#faf8ff] px-4 text-sm font-extrabold text-[#1d244c] transition-all hover:-translate-y-0.5 hover:border-[#dcd2ff] hover:text-[#6f60ff] hover:shadow-[0_14px_30px_rgba(111,96,255,0.10)]"
              >
                <action.icon className="h-5 w-5 text-[#7b68ff]" strokeWidth={2} />
                {action.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-[1fr_0.95fr] gap-6 max-xl:grid-cols-1">
          <Panel title="最近添加链接" href="/admin/links">
            <div className="divide-y divide-[#eeeaf8]">
              {recentLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 py-3.5 text-inherit transition-colors hover:text-[#6f60ff]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#f3efff] text-sm font-extrabold text-[#735fff]">
                    {link.title.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-extrabold text-[#151a42]">{link.title}</span>
                    <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#8990aa]">
                      {link.category?.name || getHost(link.url)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-[#9aa0bd]">{formatDate(link.addTime)}</span>
                </a>
              ))}
            </div>
          </Panel>

          <Panel title="分类概览" href="/admin/categories">
            <div className="space-y-3">
              {topCategories.map((category) => (
                <Link
                  key={category.id}
                  href="/admin/categories"
                  className="flex h-[46px] items-center gap-3 rounded-[12px] bg-[#fbfaff] px-4 text-inherit transition-all hover:bg-[#f3efff]"
                >
                  <FolderOpen className="h-5 w-5 shrink-0 text-[#7b68ff]" />
                  <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-[#1e244c]">
                    {category.name}
                  </span>
                  <span className="text-sm font-bold text-[#858caf]">{category._count.links}</span>
                </Link>
              ))}
            </div>
          </Panel>
        </section>

        <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#969bb6]">
          <ShieldCheck className="h-4 w-4 text-[#7b68ff]" />
          当前数据来自本地 Lune 数据库
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  href,
  children,
}: {
  title: string
  href: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[18px] border border-white/78 bg-white/72 p-6 shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold text-[#121642]">{title}</h2>
        <Link href={href} className="text-xs font-extrabold text-[#7b68ff] hover:text-[#5f4deb]">
          查看全部
        </Link>
      </div>
      {children}
    </div>
  )
}

function getHost(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function formatDate(timestamp: number) {
  if (!timestamp) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp * 1000))
}
