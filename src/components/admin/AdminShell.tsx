'use client'

import { useState } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { cn } from '@/lib/utils'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className="min-h-screen bg-admin-bg"
      style={{ '--admin-sidebar-width': collapsed ? '88px' : '250px' } as React.CSSProperties}
    >
      <AdminSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} />
      <AdminTopbar collapsed={collapsed} />
      <main
        className={cn(
          'min-h-[calc(100vh-78px)] pt-[78px] transition-[margin] duration-300 max-md:ml-0 max-md:pt-16',
          collapsed ? 'ml-[88px]' : 'ml-[250px]'
        )}
      >
        {children}
      </main>
    </div>
  )
}
