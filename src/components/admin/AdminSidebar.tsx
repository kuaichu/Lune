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
import { LuneMark } from '@/components/shared/LuneMark'

const menuItems = [
  { href: '/admin', icon: LayoutDashboard, label: '仪表盘' },
  { href: '/admin/categories', icon: FolderOpen, label: '分类管理' },
  { href: '/admin/links', icon: LinkIcon, label: '链接管理' },
  { href: '/admin/import', icon: Upload, label: '书签导入' },
  { href: '/admin/settings/site', icon: Settings, label: '站点设置' },
]

// On small screens the sidebar is a drawer and always shows labels, whatever the desktop collapsed state is.
const LABEL_MOBILE = 'max-md:max-w-[140px] max-md:opacity-100'

export function AdminSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}) {
  const pathname = usePathname()

  return (
    <>
      {/* Overlay stays mounted so the drawer can fade both ways. */}
      <div
        aria-hidden="true"
        onClick={onMobileClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ease-out motion-reduce:transition-none md:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        id="admin-sidebar"
        className={cn(
          'fixed bottom-0 left-0 top-0 z-50 overflow-x-clip border-r border-admin-line bg-admin-surface/78 shadow-[18px_0_50px_rgba(77,68,124,0.04)] backdrop-blur-2xl transition-[width] duration-300 ease-out motion-reduce:transition-none',
          'max-md:w-[264px] max-md:bg-admin-surface max-md:shadow-[18px_0_50px_rgba(10,8,40,0.18)] max-md:transition-[translate,visibility] max-md:duration-[220ms]',
          mobileOpen ? 'max-md:visible max-md:translate-x-0' : 'max-md:invisible max-md:-translate-x-full',
          collapsed ? 'w-[88px]' : 'w-[250px]'
        )}
      >
        <div className="flex h-full flex-col px-4 pb-7 pt-7">
          <Link href="/" onClick={onMobileClose} className="grid h-12 grid-cols-[56px_minmax(0,1fr)] items-center no-underline" title="Lune">
            <span className="flex justify-center">
              <LuneMark size={44} />
            </span>
            <span
              className={cn(
                'block overflow-hidden whitespace-nowrap text-[25px] font-extrabold tracking-normal text-admin-ink-strong transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none',
                collapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100',
                LABEL_MOBILE
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
                  onClick={onMobileClose}
                  aria-current={isActive ? 'page' : undefined}
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
                      collapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100',
                      LABEL_MOBILE
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
              'mt-auto grid h-12 grid-cols-[56px_minmax(0,1fr)] items-center rounded-[14px] bg-admin-tint-soft text-sm font-bold text-admin-ink-soft transition-[background-color,color] motion-reduce:transition-none hover:bg-admin-tint hover:text-admin-accent max-md:hidden'
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
    </>
  )
}
