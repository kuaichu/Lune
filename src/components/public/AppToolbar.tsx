'use client'

import Link from 'next/link'
import { Menu, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

interface AppToolbarProps {
  siteTitle: string
  isLoggedIn: boolean
  isMobileSidebarOpen: boolean
  isDesktopSidebarOpen: boolean
  onMobileMenuClick: () => void
  onDesktopMenuClick: () => void
}

interface SidebarToggleButtonProps {
  isExpanded: boolean
  onClick: () => void
}

function SidebarToggleButton({ isExpanded, onClick }: SidebarToggleButtonProps) {
  const label = isExpanded ? '收起侧栏' : '展开侧栏'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-9 h-9 mr-1.5 rounded-xl bg-white/10 hover:bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:shadow-[0_8px_18px_rgba(35,30,130,0.12),inset_0_1px_0_rgba(255,255,255,0.22)] hover:-translate-y-px transition-all motion-reduce:transition-none motion-reduce:hover:translate-y-0 text-white"
      onClick={onClick}
      aria-controls="app-sidebar"
      aria-expanded={isExpanded}
      aria-label={label}
      title={label}
    >
      <Menu className="h-6 w-6" />
    </Button>
  )
}

export function AppToolbar({
  siteTitle,
  isLoggedIn,
  isMobileSidebarOpen,
  isDesktopSidebarOpen,
  onMobileMenuClick,
  onDesktopMenuClick,
}: AppToolbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[72px] app-toolbar">
      <div className="h-full flex items-center px-[26px] max-sm:px-4">
        <div className="md:hidden">
          <SidebarToggleButton
            isExpanded={isMobileSidebarOpen}
            onClick={onMobileMenuClick}
          />
        </div>
        <div className="hidden md:block">
          <SidebarToggleButton
            isExpanded={isDesktopSidebarOpen}
            onClick={onDesktopMenuClick}
          />
        </div>

        <Link
          href="/"
          className="flex items-center text-white no-underline hover:opacity-90 transition-opacity"
        >
          <span className="text-[21px] font-extrabold leading-none relative after:content-[''] after:absolute after:left-px after:right-px after:-bottom-[7px] after:h-0.5 after:rounded-full after:bg-gradient-to-r after:from-white/70 after:to-white/20 text-shadow-[0_2px_10px_rgba(27,22,113,0.18)]">
            {siteTitle}
          </span>
        </Link>

        <div className="flex-1" />

        <ThemeToggle />

        <Link href={isLoggedIn ? '/admin' : '/login'} title={isLoggedIn ? '后台管理' : '登录'}>
          <Button
            variant="ghost"
            size="icon"
            className="w-[42px] h-[42px] rounded-full bg-transparent hover:bg-white/15 hover:shadow-[0_8px_18px_rgba(35,30,130,0.16)] text-white"
          >
            <User className="h-[26px] w-[26px]" />
          </Button>
        </Link>
      </div>
    </header>
  )
}
