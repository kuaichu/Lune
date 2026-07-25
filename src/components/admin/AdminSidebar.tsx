'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronRight,
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
        'fixed bottom-0 left-0 top-0 z-50 border-r border-[#ebe7f8] bg-white/78 shadow-[18px_0_50px_rgba(77,68,124,0.04)] backdrop-blur-2xl transition-[width] duration-300 motion-reduce:transition-none max-md:hidden',
        collapsed ? 'w-[88px]' : 'w-[250px]'
      )}
    >
      <div className={cn('flex h-full flex-col pb-7 pt-7', collapsed ? 'px-4' : 'px-6')}>
        <Link href="/" className={cn('flex h-12 items-center gap-3 no-underline', collapsed && 'justify-center')} title="Lune">
          <LuneAdminMark />
          {!collapsed && <span className="text-[25px] font-extrabold tracking-normal text-[#10133e]">Lune</span>}
        </Link>

        <nav className="mt-14 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'group flex h-[52px] items-center gap-3 rounded-[14px] text-[15px] font-extrabold transition-all motion-reduce:transition-none',
                  collapsed ? 'justify-center px-0' : 'px-4',
                  isActive
                    ? 'bg-gradient-to-r from-[#f0ebff] to-[#f8f6ff] text-[#6f60ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'
                    : 'text-[#293054] hover:bg-[#f7f4ff] hover:text-[#6f60ff]'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive ? 'text-[#735fff]' : 'text-[#8690b2] group-hover:text-[#735fff]')} />
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            'mt-auto flex h-12 items-center rounded-[14px] bg-[#f8f6ff] text-sm font-bold text-[#7c83a5] transition-all motion-reduce:transition-none hover:bg-[#f0ebff] hover:text-[#6f60ff]',
            collapsed ? 'justify-center px-0' : 'justify-between px-4'
          )}
          title={collapsed ? '展开菜单' : '收起菜单'}
          aria-label={collapsed ? '展开菜单' : '收起菜单'}
        >
          {!collapsed && (
            <span className="inline-flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              收起
            </span>
          )}
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}

function LuneAdminMark() {
  return (
    <div className="relative h-9 w-9">
      <div className="absolute inset-0 rounded-full bg-[#f2edff]" />
      <div className="absolute left-2 top-1.5 h-7 w-7 rounded-full bg-gradient-to-br from-[#8d7aff] to-[#6e5bf0]" />
      <div className="absolute left-[17px] top-0.5 h-8 w-8 rounded-full bg-white" />
    </div>
  )
}
