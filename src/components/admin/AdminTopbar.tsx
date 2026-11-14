'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Home, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/admin': '仪表盘',
  '/admin/categories': '分类管理',
  '/admin/links': '链接管理',
  '/admin/import': '书签导入',
  '/admin/settings/site': '站点设置',
}

export function AdminTopbar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const title = pageTitles[pathname] || '仪表盘'

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className={cn(
      'fixed top-0 right-0 z-40 flex h-[78px] items-center justify-between border-b border-admin-line bg-admin-tint-soft/82 px-8 backdrop-blur-2xl transition-[left] duration-300 ease-out motion-reduce:transition-none max-md:left-0 max-md:h-16 max-md:px-4',
      collapsed ? 'left-[88px]' : 'left-[250px]'
    )}>
      <Link
        href="/"
        className="flex items-center gap-3 text-sm font-extrabold text-admin-ink-soft transition-colors hover:text-admin-accent"
      >
        <Home className="h-4 w-4" />
        <span>{title}</span>
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle className="h-10 w-10 rounded-full bg-transparent text-admin-violet hover:bg-admin-tint hover:text-admin-accent" />
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-12 items-center gap-2 rounded-full border-0 bg-transparent p-0 text-admin-accent outline-none">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-admin-tint to-admin-line-strong text-lg font-extrabold shadow-[0_12px_26px_rgba(117,93,255,0.18)]">
              A
            </span>
            <ChevronDown className="h-4 w-4 text-admin-violet" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-[14px] border-admin-line shadow-[0_18px_42px_rgba(77,68,124,0.10)]">
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer rounded-lg">
              <LogOut className="h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
