'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DynamicIcon } from '@/components/shared/DynamicIcon'
import { getIconForCategory, ICON_COLORS } from '@/lib/icons'

interface SidebarCategory {
  id: number
  name: string
  fontIcon: string | null
  children: SidebarCategory[]
}

interface AppSidebarProps {
  categories: SidebarCategory[]
  isMobileOpen: boolean
  isDesktopOpen: boolean
  onMobileClose: () => void
  isLoggedIn: boolean
  onNavigate: (id: number) => void
}

export function AppSidebar({
  categories,
  isMobileOpen,
  isDesktopOpen,
  onMobileClose,
  isLoggedIn,
  onNavigate,
}: AppSidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-[72px] left-0 bottom-0 w-[248px] app-drawer z-30 transition-[transform,opacity,visibility] duration-[220ms] ease-out max-md:w-[56vw] max-md:min-w-[210px] max-md:max-w-[280px] max-md:bg-[#fbfbff] max-md:shadow-[0_14px_34px_rgba(64,60,150,0.10)] ${
          isMobileOpen ? 'max-md:translate-x-0 max-md:opacity-100 max-md:visible' : 'max-md:-translate-x-full max-md:opacity-0 max-md:invisible'
        } ${
          isDesktopOpen ? 'md:translate-x-0 md:opacity-100 md:visible' : 'md:-translate-x-full md:opacity-0 md:invisible'
        }`}
      >
        <ScrollArea className="h-[calc(100vh-72px)] max-md:block max-md:overscroll-contain">
          <div className="flex justify-stretch drawer-scroll">
            <ul className="w-full max-w-none mx-auto py-[18px] px-3 pb-7 space-y-2">
              {categories.map((cat, idx) => (
                <SidebarCategoryItem
                  key={cat.id}
                  category={cat}
                  colorIndex={idx}
                  onNavigate={(id) => {
                    onNavigate(id)
                    onMobileClose()
                  }}
                />
              ))}
              <li className="md:hidden pt-2">
                <a
                  href={isLoggedIn ? '/admin' : '/login'}
                  onClick={onMobileClose}
                  className="flex items-center gap-3.5 min-h-[50px] rounded-[14px] pl-[20px] pr-2 no-underline hover:bg-[rgba(111,96,255,0.07)] hover:shadow-[0_8px_18px_rgba(65,70,140,0.045)] transition-all"
                >
                  <DynamicIcon name={isLoggedIn ? 'LayoutDashboard' : 'LogIn'} className="w-[18px] h-[18px] text-purple-primary" />
                  <span className="text-[14.5px] font-bold text-[#444b78]">{isLoggedIn ? '后台管理' : '登录'}</span>
                </a>
              </li>
            </ul>
          </div>
        </ScrollArea>
      </aside>
    </>
  )
}

function SidebarCategoryItem({
  category,
  colorIndex,
  onNavigate,
}: {
  category: SidebarCategory
  colorIndex: number
  onNavigate: (id: number) => void
}) {
  const hasChildren = category.children && category.children.length > 0
  const icon = getIconForCategory(category.fontIcon, category.name)
  const iconColor = ICON_COLORS[colorIndex % ICON_COLORS.length]

  if (!hasChildren) {
    return (
      <li className="drawer-collapse">
        <a
          href={`#category-${category.id}`}
          onClick={(e) => { e.preventDefault(); onNavigate(category.id) }}
          className="block w-full no-underline drawer-anchor"
        >
          <div className="flex items-center min-h-[50px] rounded-[14px] pl-[12px] pr-2 hover:bg-[rgba(111,96,255,0.07)] hover:shadow-[0_8px_18px_rgba(65,70,140,0.045)] hover:translate-x-px transition-all">
            <div className="flex items-center min-w-0">
              <DynamicIcon name={icon} className="w-[18px] h-[18px] mr-3.5 shrink-0" style={{ color: iconColor }} />
              <span className="text-[14.5px] font-bold text-[#444b78]">{category.name}</span>
            </div>
          </div>
        </a>
      </li>
    )
  }

  return (
    <li>
      <Collapsible>
        <CollapsibleTrigger className="flex items-center w-full min-h-[50px] rounded-[14px] pl-[12px] pr-2 hover:bg-[rgba(111,96,255,0.07)] hover:shadow-[0_8px_18px_rgba(65,70,140,0.045)] transition-all group">
          <DynamicIcon name={icon} className="w-[18px] h-[18px] mr-3.5 shrink-0" style={{ color: iconColor }} />
          <span className="flex-1 text-left text-[14.5px] font-bold text-[#444b78]">{category.name}</span>
          <ChevronDown className="w-4 h-4 text-[#8a91aa] shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="pl-0 pt-1">
            {category.children.map((sub) => (
              <li key={sub.id}>
                <a
                  href={`#category-${sub.id}`}
                  onClick={(e) => { e.preventDefault(); onNavigate(sub.id) }}
                  className="block w-full no-underline drawer-subanchor"
                >
                  <div className="flex items-center min-h-[40px] rounded-[13px] pl-[44px] pr-2 hover:bg-[rgba(111,96,255,0.07)] hover:shadow-[0_8px_18px_rgba(65,70,140,0.045)] transition-all">
                    <DynamicIcon name="FolderOpen" className="w-[15px] h-[15px] mr-2 text-[#8a8ee6]" />
                    <span className="text-[13px] text-ink-soft">{sub.name}</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}
