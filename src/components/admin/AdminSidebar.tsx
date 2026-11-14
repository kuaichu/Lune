'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronLeft,
  FolderOpen,
  LayoutDashboard,
  Link as LinkIcon,
  Settings,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  { href: '/admin', icon: LayoutDashboard, label: '仪表盘' },
  { href: '/admin/categories', icon: FolderOpen, label: '分类管理' },
  { href: '/admin/links', icon: LinkIcon, label: '链接管理' },
  { href: '/admin/import', icon: Upload, label: '书签导入' },
  { href: '/admin/settings/site', icon: Settings, label: '站点设置' },
]

export function AdminSidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed bottom-0 left-0 top-0 z-50 overflow-x-clip border-r border-admin-line bg-admin-surface/78 shadow-[18px_0_50px_rgba(77,68,124,0.04)] backdrop-blur-2xl transition-[width] duration-300 ease-out motion-reduce:transition-none max-md:hidden',
        collapsed ? 'w-[88px]' : 'w-[250px]'
      )}
    >
      <div className="flex h-full flex-col px-4 pb-7 pt-7">
        <Link href="/" className="grid h-12 grid-cols-[56px_minmax(0,1fr)] items-center no-underline" title="Lune">
          <span className="flex justify-center">
            <LuneAdminMark />
          </span>
          <span
            className={cn(
              'block overflow-hidden whitespace-nowrap text-[25px] font-extrabold tracking-normal text-admin-ink-strong transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none',
              collapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'
            )}
          >
            Lune
          </span>
        </Link>

        <nav id="admin-navigation" className="mt-14 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'group grid h-[52px] grid-cols-[56px_minmax(0,1fr)] items-center rounded-[14px] text-[15px] font-extrabold transition-[background-color,color,box-shadow] motion-reduce:transition-none',
                  isActive
                    ? 'bg-gradient-to-r from-admin-tint to-admin-tint-soft text-admin-accent shadow-[inset_0_1px_0_var(--admin-highlight)]'
                    : 'text-admin-ink hover:bg-admin-tint-soft hover:text-admin-accent'
                )}
              >
                <span className="flex justify-center">
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-admin-accent' : 'text-admin-muted group-hover:text-admin-accent')} />
                </span>
                <span
                  className={cn(
                    'block overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none',
                    collapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            'mt-auto grid h-12 grid-cols-[56px_minmax(0,1fr)] items-center rounded-[14px] bg-admin-tint-soft text-sm font-bold text-admin-ink-soft transition-[background-color,color] motion-reduce:transition-none hover:bg-admin-tint hover:text-admin-accent'
          )}
          title={collapsed ? '展开菜单' : '收起菜单'}
          aria-label={collapsed ? '展开菜单' : '收起菜单'}
          aria-controls="admin-navigation"
          aria-expanded={!collapsed}
        >
          <span className="flex justify-center">
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform duration-300 ease-out motion-reduce:transition-none',
                collapsed && 'rotate-180'
              )}
            />
          </span>
          <span
            className={cn(
              'block overflow-hidden whitespace-nowrap text-left transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none',
              collapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'
            )}
          >
            收起
          </span>
        </button>
      </div>
    </aside>
  )
}

// Same geometry as the old cover disc: 32px circle centred at (25px, 12px) of the 28px moon.
const CRESCENT_MASK = 'radial-gradient(circle at 25px 12px, transparent 15.5px, #000 16px)'

function LuneAdminMark() {
  return (
    <div className="relative h-9 w-9">
      <div className="absolute inset-0 rounded-full bg-admin-tint" />
      {/* Cut the crescent out with a mask instead of covering it with a background-coloured disc, which showed through on other backgrounds. */}
      <div
        className="absolute left-2 top-1.5 h-7 w-7 rounded-full bg-gradient-to-br from-[#8d7aff] to-[#6e5bf0]"
        style={{ maskImage: CRESCENT_MASK, WebkitMaskImage: CRESCENT_MASK }}
      />
    </div>
  )
}
