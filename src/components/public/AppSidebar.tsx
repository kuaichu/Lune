'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DynamicIcon } from '@/components/shared/DynamicIcon'
import { getIconForCategory, ICON_COLORS } from '@/lib/icons'
import { cn } from '@/lib/utils'

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
  activeParentId: number | null
  activeChildId: number | null
  autoExpand: boolean
}

export function AppSidebar({
  categories,
  isMobileOpen,
  isDesktopOpen,
  onMobileClose,
  isLoggedIn,
  onNavigate,
  activeParentId,
  activeChildId,
  autoExpand,
}: AppSidebarProps) {
  // Keep the highlighted entry visible when the page scroll moves it out of the sidebar's own scroll range.
  useEffect(() => {
    const find = (id: number | null) =>
      id === null ? null : document.querySelector<HTMLElement>(`#app-sidebar [data-nav-id="${id}"]`)
    // A collapsed group has no child rows in the DOM, so fall back to the group row itself.
    const item = find(activeChildId) ?? find(activeParentId)
    const viewport = item?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]')
    if (!item || !viewport) return

    const itemRect = item.getBoundingClientRect()
    const viewportRect = viewport.getBoundingClientRect()
    const margin = 24
    let delta = 0
    if (itemRect.top < viewportRect.top + margin) delta = itemRect.top - viewportRect.top - margin
    else if (itemRect.bottom > viewportRect.bottom - margin) delta = itemRect.bottom - viewportRect.bottom + margin
    if (delta === 0) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    viewport.scrollTo({ top: viewport.scrollTop + delta, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [activeParentId, activeChildId])

  return (
    <>
      {/* Overlay stays mounted so both entrance and exit can fade. */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/20 transition-opacity duration-200 ease-out motion-reduce:transition-none md:hidden ${
          isMobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onMobileClose}
      />

      <aside
        id="app-sidebar"
        className={`fixed top-[72px] left-0 bottom-0 w-[248px] app-drawer z-30 transition-[translate,opacity,visibility] duration-[220ms] ease-out motion-reduce:transition-none max-md:w-[56vw] max-md:min-w-[210px] max-md:max-w-[280px] max-md:bg-surface-drawer max-md:shadow-[var(--shadow-drawer)] ${
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
                  isActive={cat.id === activeParentId}
                  activeChildId={activeChildId}
                  autoExpand={autoExpand}
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
                  className="flex items-center gap-3.5 min-h-[50px] rounded-[14px] pl-[20px] pr-2 no-underline hover:bg-hover-tint hover:shadow-[0_8px_18px_rgba(65,70,140,0.045)] transition-all"
                >
                  <DynamicIcon name={isLoggedIn ? 'LayoutDashboard' : 'LogIn'} className="w-[18px] h-[18px] text-purple-primary" />
                  <span className="text-[14.5px] font-bold text-ink-nav">{isLoggedIn ? '后台管理' : '登录'}</span>
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
  isActive,
  activeChildId,
  autoExpand,
  onNavigate,
}: {
  category: SidebarCategory
  colorIndex: number
  isActive: boolean
  activeChildId: number | null
  autoExpand: boolean
  onNavigate: (id: number) => void
}) {
  const hasChildren = category.children && category.children.length > 0
  const icon = getIconForCategory(category.fontIcon, category.name)
  const iconColor = ICON_COLORS[colorIndex % ICON_COLORS.length]
  const [open, setOpen] = useState(false)
  const [wasActive, setWasActive] = useState(false)
  // True only while the group is open because scrolling reached it, not because the user opened it.
  const [autoOpened, setAutoOpened] = useState(false)

  // Scrolling into a group opens it and scrolling away closes it again, unless the user toggled it meanwhile.
  if (isActive !== wasActive) {
    setWasActive(isActive)
    if (isActive && !open && autoExpand) {
      setOpen(true)
      setAutoOpened(true)
    } else if (!isActive && autoOpened) {
      setOpen(false)
      setAutoOpened(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    setAutoOpened(false)
  }

  const rowClass = cn(
    'relative flex items-center min-h-[50px] rounded-[14px] pl-[12px] pr-2 transition-all motion-reduce:transition-none',
    isActive
      ? 'bg-hover-tint'
      : 'hover:bg-hover-tint hover:shadow-[0_8px_18px_rgba(65,70,140,0.045)]'
  )
  const textClass = cn('text-[14.5px] font-bold', isActive ? 'text-ink-dark' : 'text-ink-nav')
  const marker = isActive && (
    <span
      aria-hidden="true"
      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
      style={{ backgroundColor: iconColor }}
    />
  )

  if (!hasChildren) {
    return (
      <li className="drawer-collapse" data-nav-id={category.id}>
        <a
          href={`#category-${category.id}`}
          onClick={(e) => { e.preventDefault(); onNavigate(category.id) }}
          aria-current={isActive ? 'location' : undefined}
          className="block w-full no-underline drawer-anchor"
        >
          <div className={cn(rowClass, !isActive && 'hover:translate-x-px motion-reduce:hover:translate-x-0')}>
            {marker}
            <div className="flex items-center min-w-0">
              <DynamicIcon name={icon} className="w-[18px] h-[18px] mr-3.5 shrink-0" style={{ color: iconColor }} />
              <span className={textClass}>{category.name}</span>
            </div>
          </div>
        </a>
      </li>
    )
  }

  return (
    <li data-nav-id={category.id}>
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger className={cn(rowClass, 'w-full group')}>
          {marker}
          <DynamicIcon name={icon} className="w-[18px] h-[18px] mr-3.5 shrink-0" style={{ color: iconColor }} />
          <span className={cn('flex-1 text-left', textClass)}>{category.name}</span>
          <span className="shrink-0 transition-transform duration-200 motion-reduce:transition-none group-data-[panel-open]:rotate-180">
            <ChevronDown className="w-4 h-4 text-ink-chevron" />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="pl-0 pt-1">
            {category.children.map((sub) => {
              const subActive = sub.id === activeChildId
              return (
                <li key={sub.id} data-nav-id={sub.id}>
                  <a
                    href={`#category-${sub.id}`}
                    onClick={(e) => { e.preventDefault(); onNavigate(sub.id) }}
                    aria-current={subActive ? 'location' : undefined}
                    className="block w-full no-underline drawer-subanchor"
                  >
                    <div
                      className={cn(
                        'flex items-center min-h-[40px] rounded-[13px] pl-[44px] pr-2 transition-all motion-reduce:transition-none',
                        subActive
                          ? 'bg-hover-tint'
                          : 'hover:bg-hover-tint hover:shadow-[0_8px_18px_rgba(65,70,140,0.045)]'
                      )}
                    >
                      <DynamicIcon
                        name="FolderOpen"
                        className={cn('w-[15px] h-[15px] mr-2', !subActive && 'text-ink-subicon')}
                        style={subActive ? { color: iconColor } : undefined}
                      />
                      <span className={cn('text-[13px]', subActive ? 'font-bold text-ink-title' : 'text-ink-soft')}>
                        {sub.name}
                      </span>
                    </div>
                  </a>
                </li>
              )
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}
