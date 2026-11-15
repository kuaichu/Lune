'use client'

import { useMemo, useRef, useState } from 'react'
import { Activity, ChevronDown, ChevronLeft, ChevronRight, CircleStop, Download, ExternalLink, Folder, FolderInput, FolderOpen, Link as LinkIcon, Lock, LockOpen, Pencil, Plus, RefreshCw, Search, Sparkle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LinkCheckStatus } from '@/lib/link-check'
import { SiteIcon } from '@/components/public/SiteIcon'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface LinkData {
  id: number
  title: string
  url: string
  categoryId: number
  property: number
  weight: number
  description: string
  fontIcon: string
  urlStandby: string
  checkStatus: number
  lastCheckedTime: string
  category: { name: string }
}

type CheckResult = { id: number; checkStatus: number; lastCheckedTime: string; detail: string }

const CHECK_BATCH_SIZE = 20

const STATUS_META: Record<number, { label: string; className: string }> = {
  [LinkCheckStatus.Unchecked]: { label: '未检测', className: 'bg-admin-tint-soft text-admin-muted' },
  [LinkCheckStatus.Ok]: { label: '正常', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
  [LinkCheckStatus.Broken]: { label: '异常', className: 'bg-red-500/10 text-red-500 dark:text-red-300' },
  [LinkCheckStatus.Unknown]: { label: '未知', className: 'bg-amber-500/12 text-amber-600 dark:text-amber-300' },
}

// Shared by the column headings and every row: link | category | check | actions; stacks to link | actions on narrow screens.
const ROW_GRID = 'grid items-center gap-4 grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-cols-[auto_minmax(0,1fr)_200px_112px_148px]'
const FILTER_SELECT_CLASS = 'h-12 rounded-[14px] bg-admin-surface/80 px-4 text-admin-ink-soft'
const BATCH_BUTTON_CLASS = 'h-9 rounded-[11px] border-admin-line bg-admin-surface px-3 text-sm font-bold text-admin-ink-soft hover:text-admin-accent'
// The base item forces accent-foreground on every descendant when focused; keep the admin accent instead.
const MENU_ITEM_CLASS = 'rounded-[9px] px-2.5 py-1.5 text-[13.5px] focus:bg-admin-tint focus:text-admin-accent focus:**:text-admin-accent'
const ACTION_CLASS ='h-8 w-8 rounded-full text-admin-muted hover:bg-admin-tint hover:text-admin-accent'

function formatCheckedTime(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return date.toDateString() === new Date().toDateString()
    ? `今天 ${time}`
    : `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`
}

// Problems first, so the statuses that need attention lead the filter chips and menu.
const STATUS_ORDER = [LinkCheckStatus.Broken, LinkCheckStatus.Unknown, LinkCheckStatus.Ok, LinkCheckStatus.Unchecked]

interface Category {
  id: number
  name: string
  parentId: number | null
}

export function LinksClient({
  initialLinks,
  initialCategories,
}: {
  initialLinks: LinkData[]
  initialCategories: Category[]
}) {
  const [links, setLinks] = useState<LinkData[]>(initialLinks)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LinkData | null>(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [property, setProperty] = useState(false)
  const [weight, setWeight] = useState('0')
  const [description, setDescription] = useState('')
  const [urlStandby, setUrlStandby] = useState('')
  const [fontIcon, setFontIcon] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterParent, setFilterParent] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [checkProgress, setCheckProgress] = useState<{ done: number; total: number } | null>(null)
  const [checkingIds, setCheckingIds] = useState<ReadonlySet<number>>(new Set())
  // Reasons are only known for checks run in this session; the database keeps the status and time.
  const [checkDetails, setCheckDetails] = useState<Record<number, string>>({})
  const stopCheckRef = useRef(false)
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set())
  const [batchBusy, setBatchBusy] = useState(false)

  function toggleSelected(ids: number[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function moveSelectedTo(categoryId: number) {
    const ids = links.filter((link) => selected.has(link.id)).map((link) => link.id)
    if (ids.length > 0 && confirm(`把 ${ids.length} 个链接移动到「${categoryPath(categories, categoryId)}」？`)) {
      void runBatch('move', ids, { categoryId })
    }
  }

  async function runBatch(action: 'delete' | 'move' | 'visibility', ids: number[], extra: Record<string, number> = {}) {
    setBatchBusy(true)
    try {
      const res = await fetch('/api/links/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids, ...extra }),
      })
      const data = await res.json()
      if (data.code !== 0) {
        toast.error(data.err_msg || '批量操作失败')
        return
      }
      const verb = action === 'delete' ? '删除' : action === 'move' ? '移动' : '更新'
      toast.success(`已${verb} ${data.count} 个链接`)
      setSelected(new Set())
      await fetchData()
    } catch {
      toast.error('批量操作请求失败')
    } finally {
      setBatchBusy(false)
    }
  }

  async function checkBatch(ids: number[]): Promise<boolean> {
    setCheckingIds((prev) => new Set([...prev, ...ids]))
    try {
      const res = await fetch('/api/links/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (data.code !== 0) {
        toast.error(data.err_msg || '检测失败')
        return false
      }
      const results = new Map((data.data as CheckResult[]).map((result) => [result.id, result]))
      setLinks((prev) => prev.map((link) => {
        const result = results.get(link.id)
        return result ? { ...link, checkStatus: result.checkStatus, lastCheckedTime: result.lastCheckedTime } : link
      }))
      setCheckDetails((prev) => {
        const next = { ...prev }
        for (const result of results.values()) next[result.id] = result.detail
        return next
      })
      return true
    } catch {
      toast.error('检测请求失败')
      return false
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.delete(id)
        return next
      })
    }
  }

  async function checkAll(ids: number[]) {
    if (ids.length === 0 || checkProgress) return
    stopCheckRef.current = false
    setCheckProgress({ done: 0, total: ids.length })
    let done = 0
    let failed = false
    for (let i = 0; i < ids.length && !stopCheckRef.current; i += CHECK_BATCH_SIZE) {
      const batch = ids.slice(i, i + CHECK_BATCH_SIZE)
      if (!(await checkBatch(batch))) {
        failed = true
        break
      }
      done += batch.length
      setCheckProgress({ done, total: ids.length })
    }
    setCheckProgress(null)
    if (!failed) toast.success(stopCheckRef.current ? `已停止，检测了 ${done} 个链接` : `检测完成，共 ${done} 个链接`)
  }

  const topCategories = useMemo(() => categories.filter((category) => category.parentId === null), [categories])
  const childCategories = useMemo(() => {
    if (!filterParent) return []
    return categories.filter((category) => category.parentId === parseInt(filterParent))
  }, [categories, filterParent])
  const childrenByParent = useMemo(() => {
    return categories.reduce<Record<number, Category[]>>((groups, category) => {
      if (category.parentId !== null) {
        groups[category.parentId] = [...(groups[category.parentId] || []), category]
      }
      return groups
    }, {})
  }, [categories])

  async function fetchData() {
    const [linksRes, catsRes] = await Promise.all([
      fetch('/api/links?limit=1000'),
      fetch('/api/categories'),
    ])
    const linksData = await linksRes.json()
    const catsData = await catsRes.json()
    if (linksData.code === 0) setLinks(linksData.data)
    if (catsData.code === 0) setCategories(catsData.data)
  }

  const openEdit = (link: LinkData) => {
    setEditing(link)
    setTitle(link.title)
    setUrl(link.url)
    setCategoryId(String(link.categoryId))
    setProperty(link.property === 1)
    setWeight(String(link.weight))
    setDescription(link.description)
    setUrlStandby(link.urlStandby)
    setFontIcon(link.fontIcon)
    setDialogOpen(true)
  }

  const openNew = () => {
    setEditing(null)
    setTitle('')
    setUrl('')
    setCategoryId(filterCat || filterParent || '')
    setProperty(false)
    setWeight('0')
    setDescription('')
    setUrlStandby('')
    setFontIcon('')
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此链接？')) return
    const res = await fetch(`/api/links/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.code === 0) {
      toast.success('已删除')
      fetchData()
    } else {
      toast.error(data.err_msg || '删除失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId) {
      toast.error('请选择分类')
      return
    }
    setLoading(true)
    const body = { title, url, categoryId: Number(categoryId), property: property ? 1 : 0, weight: parseInt(weight), description, urlStandby, fontIcon }
    const url2 = editing ? `/api/links/${editing.id}` : '/api/links'
    const method = editing ? 'PUT' : 'POST'

    const res = await fetch(url2, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)
    if (data.code === 0) {
      toast.success(editing ? '已更新' : '已创建')
      setDialogOpen(false)
      await fetchData()
      const savedId: number | undefined = editing ? editing.id : data.id
      if (savedId && (!editing || editing.url !== url)) void checkBatch([savedId])
    } else {
      toast.error(data.err_msg || '操作失败')
    }
  }

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    const parentId = filterParent ? Number(filterParent) : null
    const childId = filterCat ? Number(filterCat) : null
    const status = filterStatus ? Number(filterStatus) : null
    const categoryIds = parentId !== null
      ? new Set([parentId, ...categories.filter((category) => category.parentId === parentId).map((category) => category.id)])
      : null

    return links.filter((link) => {
      const matchCat = childId !== null ? link.categoryId === childId : categoryIds ? categoryIds.has(link.categoryId) : true
      const matchSearch = q
        ? link.title.toLowerCase().includes(q) || link.url.toLowerCase().includes(q) || link.description.toLowerCase().includes(q)
        : true
      const matchStatus = status === null || link.checkStatus === status
      return matchCat && matchSearch && matchStatus
    })
  }, [categories, filterCat, filterParent, filterStatus, links, search])

  const privateCount = links.filter((l) => l.property === 1).length
  const statusCounts = links.reduce<Record<number, number>>((counts, link) => {
    counts[link.checkStatus] = (counts[link.checkStatus] || 0) + 1
    return counts
  }, {})
  const isFiltered = Boolean(search.trim() || filterParent || filterStatus)
  const pageCount = Math.max(1, Math.ceil(filteredLinks.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pagedLinks = filteredLinks.slice((safePage - 1) * pageSize, safePage * pageSize)
  // Ignore ids of links that no longer exist (deleted elsewhere, or refreshed away).
  const selectedIds = links.filter((link) => selected.has(link.id)).map((link) => link.id)
  const pageIds = pagedLinks.map((link) => link.id)
  const pageSelectedCount = pageIds.filter((id) => selected.has(id)).length
  const allFilteredSelected = filteredLinks.length > 0 && filteredLinks.every((link) => selected.has(link.id))

  return (
    <div className="relative min-h-[calc(100vh-78px)] overflow-hidden px-8 pb-12 pt-10 max-md:px-4">
      <div className="pointer-events-none fixed bottom-0 left-[var(--admin-sidebar-width)] right-0 top-[78px] z-0 bg-[radial-gradient(circle_900px_at_360px_120px,rgba(178,154,255,0.18),transparent_48%),radial-gradient(circle_780px_at_calc(100%-180px)_520px,rgba(214,204,255,0.14),transparent_52%),var(--admin-page-base)] transition-[left] duration-300 ease-out motion-reduce:transition-none max-md:left-0 max-md:top-16" />
      <div className="relative z-10 mx-auto max-w-[1420px]">
        <div className="mb-7 flex items-end justify-between gap-4 max-md:flex-col max-md:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-admin-line bg-admin-surface/58 px-3 py-1.5 text-xs font-bold text-admin-violet">
              <Sparkle className="h-3.5 w-3.5 text-admin-accent" />
              Bookmarks
            </div>
            <h1 className="mt-5 text-[30px] font-extrabold text-admin-ink-strong">链接管理</h1>
            <p className="mt-2 text-[15px] font-semibold text-admin-muted">
              当前载入 {links.length} 个链接，{privateCount} 个私有链接
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="按检测状态筛选">
              {STATUS_ORDER.map((status) => {
                const selected = filterStatus === String(status)
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setFilterStatus(selected ? '' : String(status))
                      setPage(1)
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-transparent transition-[box-shadow,opacity] motion-reduce:transition-none',
                      STATUS_META[status].className,
                      selected ? 'ring-current' : 'opacity-85 hover:opacity-100'
                    )}
                  >
                    {STATUS_META[status].label}
                    <span className="tabular-nums">{statusCounts[status] || 0}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {checkProgress ? (
              <Button
                variant="outline"
                onClick={() => { stopCheckRef.current = true }}
                className="h-11 rounded-[14px] border-admin-line bg-admin-surface/80 px-5 font-extrabold text-admin-violet"
              >
                <CircleStop className="mr-2 h-4 w-4" /> 停止检测 {checkProgress.done} / {checkProgress.total}
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={filteredLinks.length === 0}
                onClick={() => checkAll(filteredLinks.map((link) => link.id))}
                title={isFiltered ? '只检测当前筛选出的链接' : '检测全部链接'}
                className="h-11 rounded-[14px] border-admin-line bg-admin-surface/80 px-5 font-extrabold text-admin-violet"
              >
                <Activity className="mr-2 h-4 w-4" /> {isFiltered ? `检测筛选结果（${filteredLinks.length}）` : '检测全部链接'}
              </Button>
            )}
            <a
              href="/api/links/export"
              download="lune-bookmarks.html"
              className={buttonVariants({
                variant: 'outline',
                className: 'h-11 rounded-[14px] border-admin-line bg-admin-surface/80 px-5 font-extrabold text-admin-violet',
              })}
            >
              <Download className="mr-2 h-4 w-4" /> 导出书签
            </a>
            <Button onClick={openNew} className="h-11 rounded-[14px] bg-gradient-to-r from-[#7868ff] to-[#a24eff] px-5 font-extrabold text-white shadow-[0_14px_30px_rgba(117,94,244,0.22)]">
              <Plus className="mr-2 h-4 w-4" /> 添加链接
            </Button>
          </div>
        </div>

        <section className="mb-5 rounded-[18px] border border-admin-glass/78 bg-admin-surface/72 p-5 shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl">
          <div className="grid grid-cols-[1fr_220px_220px_170px] gap-3 max-xl:grid-cols-[1fr_190px_190px_150px] max-lg:grid-cols-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-admin-violet" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="搜索标题、链接或描述"
                className="h-12 rounded-[14px] border-admin-line bg-admin-surface/80 pl-12 font-semibold text-admin-ink"
              />
            </div>
            <Select
              aria-label="按父类筛选"
              value={filterParent}
              onValueChange={(next) => {
                setFilterParent(next)
                setFilterCat('')
                setPage(1)
              }}
              icon={<FolderOpen className="text-admin-violet" />}
              options={[
                { value: '', label: '全部父类' },
                ...topCategories.map((category) => ({ value: String(category.id), label: category.name })),
              ]}
              className={FILTER_SELECT_CLASS}
            />
            <Select
              aria-label="按子类筛选"
              value={filterCat}
              disabled={!filterParent || childCategories.length === 0}
              onValueChange={(next) => {
                setFilterCat(next)
                setPage(1)
              }}
              icon={<LinkIcon className="text-admin-violet" />}
              options={[
                { value: '', label: !filterParent ? '先选择父类' : childCategories.length > 0 ? '全部子类' : '暂无子类' },
                ...childCategories.map((category) => ({ value: String(category.id), label: category.name })),
              ]}
              className={FILTER_SELECT_CLASS}
            />
            <Select
              aria-label="按检测状态筛选"
              value={filterStatus}
              onValueChange={(next) => {
                setFilterStatus(next)
                setPage(1)
              }}
              icon={<Activity className="text-admin-violet" />}
              options={[
                { value: '', label: '全部状态' },
                ...STATUS_ORDER.map((status) => ({
                  value: String(status),
                  label: `${STATUS_META[status].label}（${statusCounts[status] || 0}）`,
                })),
              ]}
              className={FILTER_SELECT_CLASS}
            />
          </div>
        </section>

        <section className="rounded-[18px] border border-admin-glass/78 bg-admin-surface/72 p-4 shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between px-2">
            <h2 className="text-sm font-extrabold text-admin-ink-strong">链接列表</h2>
            <span className="text-xs font-bold text-admin-muted">
              第 {safePage} / {pageCount} 页 · 共 {filteredLinks.length} 条
            </span>
          </div>
          {selectedIds.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[14px] border border-admin-line-strong bg-admin-tint/70 px-3 py-2.5">
              <span className="text-sm font-extrabold text-admin-ink-strong">已选 {selectedIds.length} 项</span>
              {!allFilteredSelected && (
                <button
                  type="button"
                  onClick={() => toggleSelected(filteredLinks.map((link) => link.id), true)}
                  className="text-xs font-bold text-admin-accent hover:underline"
                >
                  选择全部筛选结果（{filteredLinks.length}）
                </button>
              )}
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-bold text-admin-muted hover:text-admin-ink">
                取消选择
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  disabled={batchBusy || Boolean(checkProgress)}
                  onClick={() => checkAll(selectedIds)}
                  className={BATCH_BUTTON_CLASS}
                >
                  <Activity className="mr-1.5 h-4 w-4" /> 检测
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={batchBusy}
                    className={buttonVariants({ variant: 'outline', className: BATCH_BUTTON_CLASS })}
                  >
                    <FolderInput className="mr-1.5 h-4 w-4" /> 移动到
                    <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-80 w-60 rounded-[14px] border border-admin-line bg-admin-surface p-1.5 text-admin-ink shadow-[0_18px_42px_rgba(30,24,80,0.18)] ring-0"
                  >
                    {topCategories.map((parent, index) => (
                      <DropdownMenuGroup key={parent.id} className={cn(index > 0 && 'mt-1 border-t border-admin-line pt-1')}>
                        <DropdownMenuItem onClick={() => moveSelectedTo(parent.id)} className={cn(MENU_ITEM_CLASS, 'font-extrabold text-admin-ink-strong')}>
                          <Folder className="h-4 w-4 text-admin-accent" />
                          {parent.name}
                        </DropdownMenuItem>
                        {(childrenByParent[parent.id] || []).map((child) => (
                          <DropdownMenuItem
                            key={child.id}
                            onClick={() => moveSelectedTo(child.id)}
                            className={cn(MENU_ITEM_CLASS, 'pl-[34px] font-semibold text-admin-ink-soft')}
                          >
                            {child.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" disabled={batchBusy} onClick={() => runBatch('visibility', selectedIds, { property: 1 })} className={BATCH_BUTTON_CLASS}>
                  <Lock className="mr-1.5 h-4 w-4" /> 设为私有
                </Button>
                <Button variant="outline" disabled={batchBusy} onClick={() => runBatch('visibility', selectedIds, { property: 0 })} className={BATCH_BUTTON_CLASS}>
                  <LockOpen className="mr-1.5 h-4 w-4" /> 设为公开
                </Button>
                <Button
                  variant="outline"
                  disabled={batchBusy}
                  onClick={() => {
                    if (confirm(`确认删除选中的 ${selectedIds.length} 个链接？此操作无法撤销。`)) void runBatch('delete', selectedIds)
                  }}
                  className={cn(BATCH_BUTTON_CLASS, 'text-red-500 hover:text-red-500 dark:text-red-300')}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> 删除
                </Button>
              </div>
            </div>
          )}

          {/* Column headings line up with the row grid below; hidden where rows stack. */}
          <div className={cn(ROW_GRID, 'px-3 pb-2 text-[11px] font-bold tracking-wider text-admin-muted max-lg:hidden')}>
            <Checkbox
              aria-label="选择本页全部链接"
              checked={pageIds.length > 0 && pageSelectedCount === pageIds.length}
              indeterminate={pageSelectedCount > 0 && pageSelectedCount < pageIds.length}
              disabled={pageIds.length === 0}
              onCheckedChange={(checked) => toggleSelected(pageIds, checked === true)}
            />
            <span className="pl-11">链接</span>
            <span>分类</span>
            <span>检测</span>
            <span className="text-right">操作</span>
          </div>
          <ul className="space-y-1.5">
            {pagedLinks.map((link) => {
              const path = categoryPath(categories, link.categoryId) || link.category.name
              const checking = checkingIds.has(link.id)
              const badge = (
                <StatusBadge
                  status={link.checkStatus}
                  checking={checking}
                  detail={checkDetails[link.id]}
                  lastCheckedTime={link.lastCheckedTime}
                />
              )
              return (
                <li
                  key={link.id}
                  className={cn(
                    ROW_GRID,
                    'rounded-[12px] border px-3 py-2.5 transition-[border-color,box-shadow,background-color] hover:border-admin-line-strong hover:shadow-[0_8px_20px_rgba(111,96,255,0.07)] motion-reduce:transition-none',
                    selected.has(link.id) ? 'border-admin-line-strong bg-admin-tint/60' : 'border-admin-line bg-admin-surface/76'
                  )}
                >
                  <Checkbox
                    aria-label={`选择 ${link.title}`}
                    checked={selected.has(link.id)}
                    onCheckedChange={(checked) => toggleSelected([link.id], checked === true)}
                  />
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-admin-tint-soft">
                      <SiteIcon title={link.title} url={link.url} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[14px] font-extrabold text-admin-ink-strong">{link.title}</span>
                        {link.property === 1 && (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-admin-accent" aria-label="私有链接" />
                        )}
                      </div>
                      <p className="truncate text-[12.5px] font-semibold text-admin-muted" title={link.url}>{link.url}</p>
                      <p className="truncate text-[12px] font-bold text-admin-violet lg:hidden">{path}</p>
                    </div>
                  </div>

                  <span className="truncate text-[13px] font-bold text-admin-violet max-lg:hidden" title={path}>{path}</span>

                  <div className="flex min-w-0 flex-col items-start gap-0.5 max-lg:hidden">
                    {badge}
                    <span className="text-[11px] font-semibold tabular-nums text-admin-muted" suppressHydrationWarning>
                      {formatCheckedTime(link.lastCheckedTime)}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center justify-end gap-0.5">
                    <span className="mr-1 lg:hidden">{badge}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={ACTION_CLASS}
                      disabled={checking}
                      onClick={() => void checkBatch([link.id])}
                      title="重新检测"
                      aria-label="重新检测"
                    >
                      <RefreshCw className={cn('h-4 w-4', checking && 'animate-spin motion-reduce:animate-none')} />
                    </Button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="打开链接"
                      aria-label="打开链接"
                      className={buttonVariants({ variant: 'ghost', size: 'icon', className: ACTION_CLASS })}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <Button variant="ghost" size="icon" className={ACTION_CLASS} onClick={() => openEdit(link)} title="编辑" aria-label="编辑">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(ACTION_CLASS, 'hover:text-red-500')}
                      onClick={() => handleDelete(link.id)}
                      title="删除"
                      aria-label="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
          {pagedLinks.length === 0 && (
            <div className="rounded-[14px] border border-dashed border-admin-line bg-admin-surface/70 px-4 py-12 text-center text-sm font-bold text-admin-muted">
              没有找到匹配的链接
            </div>
          )}
          {filteredLinks.length > pageSize && (
            <div className="mt-4 flex items-center justify-between border-t border-admin-line px-2 pt-4">
              <span className="text-xs font-bold text-admin-muted">
                当前显示 {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredLinks.length)}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="h-9 rounded-full px-3 font-bold text-admin-accent"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> 上一页
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 rounded-full px-3 font-bold text-admin-accent"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  下一页 <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-[22px] border-admin-line bg-admin-surface/90 shadow-[0_24px_70px_rgba(77,68,124,0.14)] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-admin-ink-strong">
              {editing ? '编辑链接' : '添加链接'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="标题">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-[13px] border-admin-line" required />
            </Field>
            <Field label="URL">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} className="h-11 rounded-[13px] border-admin-line" required />
            </Field>
            <Field label="备用 URL">
              <Input value={urlStandby} onChange={(e) => setUrlStandby(e.target.value)} className="h-11 rounded-[13px] border-admin-line" />
            </Field>
            <Field label="所属分类">
              <Select
                aria-label="所属分类"
                value={categoryId}
                onValueChange={setCategoryId}
                placeholder="请选择分类"
                options={topCategories.map((parent) => ({
                  label: parent.name,
                  options: [
                    { value: String(parent.id), label: parent.name },
                    ...(childrenByParent[parent.id] || []).map((child) => ({ value: String(child.id), label: child.name })),
                  ],
                }))}
              />
              {categories.length === 0 && (
                <p className="mt-2 text-sm font-semibold text-admin-muted">请先在分类管理中创建分类。</p>
              )}
            </Field>
            <Field label="权重">
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-11 rounded-[13px] border-admin-line" />
            </Field>
            <Field label="描述">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-11 rounded-[13px] border-admin-line" />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox id="link-property" checked={property} onCheckedChange={(c) => setProperty(c === true)} />
              <Label htmlFor="link-property" className="font-bold text-admin-ink">私有链接</Label>
            </div>
            <Button type="submit" disabled={loading || categories.length === 0} className="h-12 w-full rounded-[14px] bg-gradient-to-r from-[#7868ff] to-[#a24eff] font-extrabold text-white">
              {editing ? '保存修改' : '添加链接'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({
  status,
  checking,
  detail,
  lastCheckedTime,
}: {
  status: number
  checking: boolean
  detail?: string
  lastCheckedTime: string
}) {
  const meta = STATUS_META[status] ?? STATUS_META[LinkCheckStatus.Unchecked]
  const checkedAt = lastCheckedTime ? new Date(lastCheckedTime) : null
  const checkedText = checkedAt && !Number.isNaN(checkedAt.getTime()) ? checkedAt.toLocaleString('zh-CN') : lastCheckedTime
  const title = [detail, checkedText && `检测于 ${checkedText}`].filter(Boolean).join('\n') || undefined

  return (
    <span
      title={title}
      // The server and browser may format the time in different time zones.
      suppressHydrationWarning
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold',
        checking ? 'bg-admin-tint text-admin-accent' : meta.className
      )}
    >
      {checking ? '检测中' : meta.label}
    </span>
  )
}

function categoryPath(categories: Category[], id: number) {
  const category = categories.find((item) => item.id === id)
  if (!category) return ''
  const parent = categories.find((item) => item.id === category.parentId)
  return parent ? `${parent.name} / ${category.name}` : category.name
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block font-bold text-admin-ink">{label}</Label>
      {children}
    </div>
  )
}
