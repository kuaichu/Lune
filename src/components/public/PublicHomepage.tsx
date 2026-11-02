'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppToolbar } from './AppToolbar'
import { AppSidebar } from './AppSidebar'
import { SearchBar } from './SearchBar'
import { CategorySection } from './CategorySection'
import { PageBackground } from './PageBackground'
import { FabButtons } from './FabButtons'
import { LinkContextData } from './LinkCard'
import { DynamicIcon } from '@/components/shared/DynamicIcon'
import { getIconForCategory, ICON_COLORS } from '@/lib/icons'
import { Lock, SearchX } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { filterPublicCategories, type PublicCategoryData } from '@/lib/public-homepage-data'

interface PublicHomepageProps {
  categories: PublicCategoryData[]
  categoryOptions: { id: number; name: string }[]
  siteTitle: string
  isLoggedIn: boolean
}

export function PublicHomepage({ categories, categoryOptions, siteTitle, isLoggedIn }: PublicHomepageProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<LinkContextData | null>(null)
  const [deleting, setDeleting] = useState(false)
  const deletingRef = useRef(false)

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!mobileSidebarOpen) return

    const html = document.documentElement
    const body = document.body
    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = body.style.overflow

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    return () => {
      html.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
    }
  }, [mobileSidebarOpen])

  const handleDeleteRequest = useCallback((data: LinkContextData) => {
    setPendingDelete(data)
  }, [])

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open && !deletingRef.current) {
      setPendingDelete(null)
    }
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete || deletingRef.current) return

    deletingRef.current = true
    setDeleting(true)

    try {
      const response = await fetch(`/api/links/${pendingDelete.id}`, { method: 'DELETE' })
      const result: unknown = await response.json().catch(() => null)
      const succeeded =
        response.ok &&
        typeof result === 'object' &&
        result !== null &&
        'code' in result &&
        result.code === 0

      if (!succeeded) {
        toast.error('删除失败，请稍后重试')
        return
      }

      setPendingDelete(null)
      toast.success('链接已删除')
      router.refresh()
    } catch {
      toast.error('删除失败，请稍后重试')
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }, [pendingDelete, router])

  const handleOpen = useCallback((data: LinkContextData) => {
    window.open(data.url, '_blank', 'noopener,noreferrer')
  }, [])

  const filteredCategories = useMemo(() => {
    return filterPublicCategories(categories, search)
  }, [categories, search])

  const trimmedSearch = search.trim()
  const resultCount = useMemo(() => {
    const visible: readonly PublicCategoryData[] = filteredCategories
    return visible.reduce<number>(
      (sum, cat) =>
        sum + cat.links.length + cat.childSections.reduce<number>((inner, child) => inner + child.links.length, 0),
      0
    )
  }, [filteredCategories])

  // Section the page is currently scrolled to, highlighted in the sidebar.
  const [active, setActive] = useState<{ parentId: number | null; childId: number | null }>({
    parentId: null,
    childId: null,
  })

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const toolbar = document.querySelector<HTMLElement>('.app-toolbar')
      const line = (toolbar?.offsetHeight ?? 72) + 24
      let parentId: number | null = null
      let childId: number | null = null

      for (const cat of filteredCategories) {
        const parentEl = document.getElementById(`category-${cat.id}`)
        if (!parentEl) continue
        if (parentEl.getBoundingClientRect().top > line) break

        parentId = cat.id
        childId = null
        for (const child of cat.childSections) {
          const childEl = document.getElementById(`category-${child.id}`)
          if (!childEl) continue
          if (childEl.getBoundingClientRect().top > line) break
          childId = child.id
        }
      }

      setActive((prev) => (prev.parentId === parentId && prev.childId === childId ? prev : { parentId, childId }))
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [filteredCategories])

  // Same index-based palette as the sidebar, keyed by id so colors stay put while searching.
  const accentById = useMemo(
    () => new Map(categories.map((cat, index) => [cat.id, ICON_COLORS[index % ICON_COLORS.length]])),
    [categories]
  )

  const handleNavigate = useCallback((id: number) => {
    const el = document.getElementById(`category-${id}`)
    if (el) {
      const toolbar = document.querySelector('.app-toolbar') as HTMLElement
      const offset = (toolbar?.offsetHeight || 64) + 14
      const top = el.getBoundingClientRect().top + window.pageYOffset - offset
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      window.scrollTo({ top: Math.max(0, top), behavior })
    }
  }, [])

  return (
    <div className="min-h-screen">
      <PageBackground />

      <AppToolbar
        siteTitle={siteTitle}
        isLoggedIn={isLoggedIn}
        isMobileSidebarOpen={mobileSidebarOpen}
        isDesktopSidebarOpen={desktopSidebarOpen}
        onMobileMenuClick={() => setMobileSidebarOpen((isOpen) => !isOpen)}
        onDesktopMenuClick={() => setDesktopSidebarOpen((isOpen) => !isOpen)}
      />

      <AppSidebar
        categories={categories}
        isMobileOpen={mobileSidebarOpen}
        isDesktopOpen={desktopSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        isLoggedIn={isLoggedIn}
        onNavigate={handleNavigate}
        activeParentId={active.parentId}
        activeChildId={active.childId}
      />

      <div
        className={`w-full ml-0 pt-[76px] pb-0 px-0 box-border transition-[width,margin-left] duration-[220ms] ease-out motion-reduce:transition-none md:pt-[88px] md:px-[40px] ${
          desktopSidebarOpen
            ? 'md:w-[calc(100%-var(--drawer-width))] md:ml-[var(--drawer-width)]'
            : 'md:w-full md:ml-0'
        }`}
      >
        <div className="max-w-[1500px] mx-auto pb-9 px-0 max-md:px-[18px]">
          <div className="mt-0 lune-rise-enter">
            <SearchBar value={search} onChange={setSearch} resultCount={trimmedSearch ? resultCount : null} />
          </div>

          {trimmedSearch && resultCount === 0 && (
            <div className="parent-section mt-7 flex flex-col items-center rounded-[22px] px-6 py-16 text-center lune-fade-enter">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-hover-tint text-purple-primary">
                <SearchX className="h-7 w-7" />
              </span>
              <p className="mt-5 text-lg font-extrabold text-ink-dark">没有找到相关书签</p>
              <p className="mt-2 max-w-md break-all text-sm font-medium text-ink-muted">
                没有与“{trimmedSearch}”匹配的标题、描述或网址，换个关键词试试。
              </p>
              <Button type="button" variant="outline" className="mt-6 rounded-xl" onClick={() => setSearch('')}>
                清除搜索
              </Button>
            </div>
          )}

          <div className="pt-7">
            {filteredCategories.map((cat, index) => {
              const hasOwnLinks = cat.links.length > 0
              const hasChildren = cat.childSections.length > 0
              const flattenSingleChild =
                !hasOwnLinks && cat.childSections.length === 1 && cat.childSections[0].name === cat.name

              if (!hasOwnLinks && !hasChildren) return null

              const icon = getIconForCategory(cat.fontIcon, cat.name)
              const accent = accentById.get(cat.id) ?? ICON_COLORS[0]
              const totalLinks =
                cat.links.length + cat.childSections.reduce((sum, child) => sum + child.links.length, 0)

              return (
                <section
                  key={cat.id}
                  id={`category-${cat.id}`}
                  className={`parent-section rounded-[22px] p-5 px-[22px] pb-[26px] mb-8 ${
                    index === 0 ? 'lune-fade-enter lune-delay-1' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-h-9 mb-5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)` }}
                    >
                      <DynamicIcon name={icon} className="w-5 h-5" />
                    </span>
                    <h2 className="text-[21px] font-extrabold text-ink-dark">{cat.name}</h2>
                    {cat.property === 1 && <Lock className="w-3.5 h-3.5 text-[#5fb878]" />}
                    <span className="rounded-full bg-hover-tint px-2 py-0.5 text-xs font-bold text-ink-muted">
                      {totalLinks}
                    </span>
                  </div>

                  <div className="flex flex-col gap-7">
                    {/* Own links sit directly under the category header */}
                    {hasOwnLinks && (
                      <CategorySection
                        category={{
                          id: cat.id,
                          name: cat.name,
                          property: cat.property,
                          fontIcon: cat.fontIcon,
                          links: cat.links,
                        }}
                        showTitle={false}
                        accent={accent}
                        isLoggedIn={isLoggedIn}
                        onLinkOpen={handleOpen}
                        onLinkDelete={handleDeleteRequest}
                      />
                    )}

                    {/* Child categories */}
                    {cat.childSections.map((child) => (
                      <CategorySection
                        key={child.id}
                        category={{
                          id: child.id,
                          name: child.name,
                          property: child.property,
                          fontIcon: child.fontIcon,
                          links: child.links,
                        }}
                        showTitle={!flattenSingleChild}
                        accent={accent}
                        isLoggedIn={isLoggedIn}
                        onLinkOpen={handleOpen}
                        onLinkDelete={handleDeleteRequest}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>

      <FabButtons
        isLoggedIn={isLoggedIn}
        onAddClick={() => setAddDialogOpen(true)}
        showBackToTop={showBackToTop}
      />

      <Dialog open={pendingDelete !== null} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent role="alertdialog" className="rounded-2xl" showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-ink-dark">确认删除链接</DialogTitle>
            <DialogDescription>
              确定要删除“{pendingDelete?.title}”吗？删除后不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleConfirmDelete()}
            >
              {deleting ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer
        className={`w-full ml-0 my-3.5 mb-5 px-[18px] text-center text-ink-muted text-sm transition-[width,margin-left] duration-[220ms] ease-out motion-reduce:transition-none md:px-[40px] ${
          desktopSidebarOpen
            ? 'md:w-[calc(100%-var(--drawer-width))] md:ml-[var(--drawer-width)]'
            : 'md:w-full md:ml-0'
        }`}
      >
        &copy; {new Date().getFullYear()} {siteTitle} · Powered by{' '}
        <span className="font-semibold text-purple-primary">Lune</span>
      </footer>

      {/* Quick Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="rounded-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-ink-dark">快速添加链接</DialogTitle>
          </DialogHeader>
          <QuickAddForm
            categories={categoryOptions}
            onSuccess={() => {
              setAddDialogOpen(false)
              router.refresh()
              toast.success('链接已添加')
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function QuickAddForm({
  categories,
  onSuccess,
}: {
  categories: { id: number; name: string }[]
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !url) return
    if (!categoryId) {
      toast.error('请选择分类')
      return
    }
    setLoading(true)
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, url, categoryId: Number(categoryId) }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.code === 0) {
      onSuccess()
    } else {
      toast.error(data.err_msg || '添加失败')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        className="w-full h-12 rounded-xl border border-line-input bg-surface-input px-4 text-ink placeholder:text-ink-muted outline-none focus:border-purple-primary"
        placeholder="链接标题"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        className="w-full h-12 rounded-xl border border-line-input bg-surface-input px-4 text-ink placeholder:text-ink-muted outline-none focus:border-purple-primary"
        placeholder="链接地址 https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />
      <select
        className="w-full h-12 rounded-xl border border-line-input bg-surface-input px-4 text-ink outline-none focus:border-purple-primary"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        required
      >
        <option value="">选择分类</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {categories.length === 0 && (
        <p className="text-sm font-semibold text-ink-muted">
          当前没有分类，请先前往 <a href="/admin/categories" className="text-purple-primary">分类管理</a> 创建分类。
        </p>
      )}
      <Button type="submit" disabled={loading || categories.length === 0} className="w-full h-12 rounded-xl app-toolbar font-extrabold">
        添加
      </Button>
    </form>
  )
}
