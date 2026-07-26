'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, ExternalLink, FolderOpen, Globe, Link as LinkIcon, Lock, Pencil, Plus, Search, Sparkle, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  category: { name: string }
}

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
  const [page, setPage] = useState(1)
  const pageSize = 40

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
      fetchData()
    } else {
      toast.error(data.err_msg || '操作失败')
    }
  }

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    const parentId = filterParent ? Number(filterParent) : null
    const childId = filterCat ? Number(filterCat) : null
    const categoryIds = parentId !== null
      ? new Set([parentId, ...categories.filter((category) => category.parentId === parentId).map((category) => category.id)])
      : null

    return links.filter((link) => {
      const matchCat = childId !== null ? link.categoryId === childId : categoryIds ? categoryIds.has(link.categoryId) : true
      const matchSearch = q
        ? link.title.toLowerCase().includes(q) || link.url.toLowerCase().includes(q) || link.description.toLowerCase().includes(q)
        : true
      return matchCat && matchSearch
    })
  }, [categories, filterCat, filterParent, links, search])

  const privateCount = links.filter((l) => l.property === 1).length
  const pageCount = Math.max(1, Math.ceil(filteredLinks.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pagedLinks = filteredLinks.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="relative min-h-[calc(100vh-78px)] overflow-hidden px-8 pb-12 pt-10 max-md:px-4">
      <div className="pointer-events-none fixed bottom-0 left-[var(--admin-sidebar-width)] right-0 top-[78px] z-0 bg-[radial-gradient(circle_900px_at_360px_120px,rgba(178,154,255,0.18),transparent_48%),radial-gradient(circle_780px_at_calc(100%-180px)_520px,rgba(214,204,255,0.14),transparent_52%),linear-gradient(180deg,#f8f7ff_0%,#f9faff_100%)] transition-[left] duration-300 motion-reduce:transition-none max-md:left-0 max-md:top-16" />
      <div className="relative z-10 mx-auto max-w-[1420px]">
        <div className="mb-7 flex items-end justify-between gap-4 max-md:flex-col max-md:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ebe7f8] bg-white/58 px-3 py-1.5 text-xs font-bold text-[#827ab5]">
              <Sparkle className="h-3.5 w-3.5 text-[#7b68ff]" />
              Bookmarks
            </div>
            <h1 className="mt-5 text-[30px] font-extrabold text-[#10133e]">链接管理</h1>
            <p className="mt-2 text-[15px] font-semibold text-[#858caf]">
              当前载入 {links.length} 个链接，{privateCount} 个私有链接
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/links/export"
              download="lune-bookmarks.html"
              className={buttonVariants({
                variant: 'outline',
                className: 'h-11 rounded-[14px] border-[#ddd6f7] bg-white/80 px-5 font-extrabold text-[#5f55a5]',
              })}
            >
              <Download className="mr-2 h-4 w-4" /> 导出书签
            </a>
            <Button onClick={openNew} className="h-11 rounded-[14px] bg-gradient-to-r from-[#7868ff] to-[#a24eff] px-5 font-extrabold text-white shadow-[0_14px_30px_rgba(117,94,244,0.22)]">
              <Plus className="mr-2 h-4 w-4" /> 添加链接
            </Button>
          </div>
        </div>

        <section className="mb-5 rounded-[18px] border border-white/78 bg-white/72 p-5 shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl">
          <div className="grid grid-cols-[1fr_220px_220px] gap-3 max-xl:grid-cols-[1fr_210px_210px] max-lg:grid-cols-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8d82c8]" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="搜索标题、链接或描述"
                className="h-12 rounded-[14px] border-[#e2dcf6] bg-white/80 pl-12 font-semibold text-[#293054]"
              />
            </div>
            <div className="relative">
              <FolderOpen className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d82c8]" />
              <select
                value={filterParent}
                onChange={(e) => {
                  setFilterParent(e.target.value)
                  setFilterCat('')
                  setPage(1)
                }}
                className="h-12 w-full appearance-none rounded-[14px] border border-[#e2dcf6] bg-white/80 px-11 pr-9 text-sm font-bold text-[#697193] outline-none"
              >
                <option value="">全部父类</option>
                {topCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 rotate-90 -translate-y-1/2 text-[#8d82c8]" />
            </div>
            <div className="relative">
              <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d82c8]" />
              <select
                value={filterCat}
                disabled={!filterParent || childCategories.length === 0}
                onChange={(e) => {
                  setFilterCat(e.target.value)
                  setPage(1)
                }}
                className="h-12 w-full appearance-none rounded-[14px] border border-[#e2dcf6] bg-white/80 px-11 pr-9 text-sm font-bold text-[#697193] outline-none disabled:cursor-not-allowed disabled:bg-[#f8f6ff] disabled:text-[#b7b1d4]"
              >
                <option value="">
                  {!filterParent ? '先选择父类' : childCategories.length > 0 ? '全部子类' : '暂无子类'}
                </option>
                {childCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 rotate-90 -translate-y-1/2 text-[#8d82c8]" />
            </div>
          </div>
        </section>

        <section className="rounded-[18px] border border-white/78 bg-white/72 p-4 shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between px-2">
            <h2 className="text-sm font-extrabold text-[#121642]">链接列表</h2>
            <span className="text-xs font-bold text-[#8c93b0]">
              第 {safePage} / {pageCount} 页 · 共 {filteredLinks.length} 条
            </span>
          </div>
          <div className="space-y-2">
            {pagedLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between gap-4 rounded-[14px] border border-[#eeeaf8] bg-white/76 p-4 transition-all hover:border-[#dcd2ff] hover:shadow-[0_12px_28px_rgba(111,96,255,0.08)]">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#f3efff] text-[#735fff]">
                    <LinkIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-extrabold text-[#151a42]">{link.title}</span>
                      {link.property === 1 ? <Lock className="h-3.5 w-3.5 shrink-0 text-[#735fff]" /> : <Globe className="h-3.5 w-3.5 shrink-0 text-[#9aa0bd]" />}
                    </div>
                    <p className="mt-0.5 truncate text-[13px] font-semibold text-[#858caf]">{link.url}</p>
                    <span className="mt-1 inline-flex rounded-full bg-[#f3efff] px-2 py-0.5 text-xs font-bold text-[#735fff]">
                      {categoryPath(categories, link.categoryId) || link.category.name}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-[#7b68ff]">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-[#7b68ff]" onClick={() => openEdit(link)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-red-500" onClick={() => handleDelete(link.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {pagedLinks.length === 0 && (
              <div className="rounded-[14px] border border-dashed border-[#e2dcf6] bg-white/70 px-4 py-12 text-center text-sm font-bold text-[#969bb6]">
                没有找到匹配的链接
              </div>
            )}
          </div>
          {filteredLinks.length > pageSize && (
            <div className="mt-4 flex items-center justify-between border-t border-[#eeeaf8] px-2 pt-4">
              <span className="text-xs font-bold text-[#969bb6]">
                当前显示 {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredLinks.length)}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="h-9 rounded-full px-3 font-bold text-[#735fff]"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> 上一页
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 rounded-full px-3 font-bold text-[#735fff]"
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
        <DialogContent className="max-w-lg rounded-[22px] border-[#ebe7f8] bg-white/90 shadow-[0_24px_70px_rgba(77,68,124,0.14)] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#121642]">
              {editing ? '编辑链接' : '添加链接'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="标题">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-[13px] border-[#e2dcf6]" required />
            </Field>
            <Field label="URL">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} className="h-11 rounded-[13px] border-[#e2dcf6]" required />
            </Field>
            <Field label="备用 URL">
              <Input value={urlStandby} onChange={(e) => setUrlStandby(e.target.value)} className="h-11 rounded-[13px] border-[#e2dcf6]" />
            </Field>
            <Field label="所属分类">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="h-11 w-full rounded-[13px] border border-[#e2dcf6] bg-white px-3 text-[#293054] outline-none">
                <option value="">请选择分类</option>
                {topCategories.map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>{parent.name}</option>
                    {(childrenByParent[parent.id] || []).map((child) => (
                      <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="mt-2 text-sm font-semibold text-[#858caf]">请先在分类管理中创建分类。</p>
              )}
            </Field>
            <Field label="权重">
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-11 rounded-[13px] border-[#e2dcf6]" />
            </Field>
            <Field label="描述">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-11 rounded-[13px] border-[#e2dcf6]" />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox id="link-property" checked={property} onCheckedChange={(c) => setProperty(c === true)} />
              <Label htmlFor="link-property" className="font-bold text-[#293054]">私有链接</Label>
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

function categoryPath(categories: Category[], id: number) {
  const category = categories.find((item) => item.id === id)
  if (!category) return ''
  const parent = categories.find((item) => item.id === category.parentId)
  return parent ? `${parent.name} / ${category.name}` : category.name
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block font-bold text-[#293054]">{label}</Label>
      {children}
    </div>
  )
}
