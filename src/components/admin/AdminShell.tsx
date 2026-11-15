'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { cn } from '@/lib/utils'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  // Below md the sidebar becomes a slide-in drawer opened from the topbar.
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!mobileNavOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileNavOpen])

  return (
    <div
      className="min-h-screen bg-admin-bg"
      style={{ '--admin-sidebar-width': collapsed ? '88px' : '250px' } as React.CSSProperties}
    >
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <AdminTopbar
        collapsed={collapsed}
        mobileNavOpen={mobileNavOpen}
        onMobileMenuClick={() => setMobileNavOpen((open) => !open)}
      />
      <main
        className={cn(
          'min-h-[calc(100vh-78px)] pt-[78px] transition-[margin] duration-300 ease-out motion-reduce:transition-none max-md:ml-0 max-md:pt-16',
          collapsed ? 'ml-[88px]' : 'ml-[250px]'
        )}
      >
        <div key={pathname} className="min-h-full lune-route-enter">
          {children}
        </div>
      </main>
    </div>
  )
}
