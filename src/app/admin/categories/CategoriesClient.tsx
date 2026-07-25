'use client'

import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FolderPlus,
  Globe,
  Lock,
  Pencil,
  Plus,
  Sparkle,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Category {
  id: number
  name: string
  parentId: number | null
  property: number
  weight: number
  description: string
  fontIcon: string
  _count?: { links: number }
}

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [selectedId, setSelectedId] = useState(initialCategories[0]?.id || 0)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    const firstParent = initialCategories.find((category) => category.parentId === null)
    return firstParent ? new Set([firstParent.id]) : new Set()
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [property, setProperty] = useState(false)
  const [weight, setWeight] = useState('0')
  const [description, setDescription] = useState('')
  const [fontIcon, setFontIcon] = useState('')
  const [loading, setLoading] = useState(false)

  const topLevel = useMemo(() => categories.filter((category) => category.parentId === null), [categories])
  const childByParent = useMemo(() => {
    return categories.reduce<Record<number, Category[]>>((groups, category) => {
      if (category.parentId !== null) {
        groups[category.parentId] = [...(groups[category.parentId] || []), category]
      }
      return groups
    }, {})
  }, [categories])

  const selectedCategory = useMemo(() => {
    return categories.find((category) => category.id === selectedId) || topLevel[0] || categories[0] || null
  }, [categories, selectedId, topLevel])
  const selectedChildren = selectedCategory ? childByParent[selectedCategory.id] || [] : []
  const selectedParent = selectedCategory?.parentId !== null && selectedCategory?.parentId !== undefined
    ? categories.find((category) => category.id === selectedCategory.parentId) || null
    : null
  const childCount = categories.length - topLevel.length
  const privateCount = categories.filter((category) => category.property === 1).length
  const linkTotal = categories.reduce((sum, category) => sum + (category._count?.links || 0), 0)
  const selectedDirectLinks = selectedCategory?._count?.links || 0
  const selectedChildLinks = selectedChildren.reduce((sum, category) => sum + (category._count?.links || 0), 0)

  async function fetchCategories() {
    const res = await fetch('/api/categories')
    const data = await res.json()
    if (data.code === 0) {
      setCategories(data.data)
      return data.data as Category[]
    }
    return categories
  }

  const toggleExpanded = (id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setName(cat.name)
    setParentId(cat.parentId === null ? '' : String(cat.parentId))
    setProperty(cat.property === 1)
    setWeight(String(cat.weight))
    setDescription(cat.description)
    setFontIcon(cat.fontIcon)
    setDialogOpen(true)
  }

  const openNew = (parent?: Category | null) => {
    setEditing(null)
    setName('')
    setParentId(parent ? String(parent.id) : '')
    setProperty(parent?.property === 1)
    setWeight('0')
    setDescription('')
    setFontIcon('')
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    const target = categories.find((category) => category.id === id)
    if (!target) return
    if (!confirm('确认删除此分类？子分类和链接将一并删除。')) return

    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.code === 0) {
      toast.success('已删除')
      const nextCategories = categories.filter((category) => category.id !== id && category.parentId !== id)
      if (selectedId === id || target.id === selectedCategory?.parentId || selectedCategory?.parentId === id) {
        setSelectedId(nextCategories.find((category) => category.parentId === null)?.id || nextCategories[0]?.id || 0)
      }
      await fetchCategories()
    } else {
      toast.error(data.err_msg || '删除失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const nextParentId = parentId === '' ? null : Number(parentId)
    const body = { name, parentId: nextParentId, property: property ? 1 : 0, weight: parseInt(weight), description, fontIcon }
    const url = editing ? `/api/categories/${editing.id}` : '/api/categories'
    const method = editing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)
    if (data.code === 0) {
      toast.success(editing ? '已更新' : '已创建')
      setDialogOpen(false)
      if (nextParentId !== null) {
        setExpandedIds((current) => new Set(current).add(nextParentId))
      }
      setSelectedId(editing ? editing.id : data.id)
      await fetchCategories()
    } else {
      toast.error(data.err_msg || '操作失败')
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-78px)] overflow-hidden px-8 pb-12 pt-10 max-md:px-4">
      <div className="pointer-events-none fixed bottom-0 left-[var(--admin-sidebar-width)] right-0 top-[78px] z-0 bg-[radial-gradient(circle_900px_at_360px_120px,rgba(178,154,255,0.18),transparent_48%),radial-gradient(circle_780px_at_calc(100%-180px)_520px,rgba(214,204,255,0.14),transparent_52%),linear-gradient(180deg,#f8f7ff_0%,#f9faff_100%)] transition-[left] duration-300 max-md:left-0 max-md:top-16" />
      <div className="relative z-10 mx-auto max-w-[1420px]">
        <div className="mb-7 flex items-end justify-between gap-4 max-md:flex-col max-md:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ebe7f8] bg-white/58 px-3 py-1.5 text-xs font-bold text-[#827ab5]">
              <Sparkle className="h-3.5 w-3.5 text-[#7b68ff]" />
              Categories
            </div>
            <h1 className="mt-5 text-[30px] font-extrabold text-[#10133e]">分类管理</h1>
            <p className="mt-2 text-[15px] font-semibold text-[#858caf]">像整理文件夹一样管理 Lune 的导航目录</p>
          </div>
          <Button onClick={() => openNew()} className="h-11 rounded-[14px] bg-gradient-to-r from-[#7868ff] to-[#a24eff] px-5 font-extrabold text-white shadow-[0_14px_30px_rgba(117,94,244,0.22)]">
            <Plus className="mr-2 h-4 w-4" /> 添加分类
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
          <SummaryCard label="全部分类" value={categories.length} />
          <SummaryCard label="顶级分类" value={topLevel.length} />
          <SummaryCard label="二级分类" value={childCount} />
          <SummaryCard label="关联链接" value={linkTotal} />
        </div>

        <div className="grid grid-cols-[410px_1fr] items-start gap-5 max-xl:grid-cols-1">
          <section className="max-h-[calc(100vh-220px)] overflow-y-auto rounded-[20px] border border-white/78 bg-white/76 p-4 shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl max-xl:max-h-none">
            <div className="mb-3 flex items-center justify-between px-2">
              <h2 className="text-sm font-extrabold text-[#121642]">目录结构</h2>
              <span className="text-xs font-bold text-[#8c93b0]">{topLevel.length} 个父类</span>
            </div>
            <div className="space-y-1.5">
              {topLevel.map((parent) => {
                const children = childByParent[parent.id] || []
                const isExpanded = expandedIds.has(parent.id)
                return (
                  <div key={parent.id} className="rounded-[14px]">
                    <TreeRow
                      category={parent}
                      selected={selectedCategory?.id === parent.id}
                      expanded={isExpanded}
                      childCount={children.length}
                      depth={0}
                      onSelect={() => setSelectedId(parent.id)}
                      onToggle={() => toggleExpanded(parent.id)}
                      onAddChild={() => openNew(parent)}
                      onEdit={() => openEdit(parent)}
                      onDelete={() => handleDelete(parent.id)}
                    />
                    {isExpanded && (
                      <div className="ml-5 mt-1 space-y-1 border-l border-[#e8e2f8] pl-3">
                        {children.length > 0 ? (
                          children.map((child) => (
                            <TreeRow
                              key={child.id}
                              category={child}
                              selected={selectedCategory?.id === child.id}
                              depth={1}
                              onSelect={() => setSelectedId(child.id)}
                              onEdit={() => openEdit(child)}
                              onDelete={() => handleDelete(child.id)}
                            />
                          ))
                        ) : (
                          <div className="rounded-[12px] px-3 py-3 text-xs font-bold text-[#a0a6c2]">
                            暂无子目录
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-[20px] border border-white/78 bg-white/76 p-6 shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl">
            {selectedCategory ? (
              <>
                <div className="flex items-start justify-between gap-4 max-md:flex-col">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#f0ebff] text-[#735fff]">
                      <FolderOpen className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-[24px] font-extrabold text-[#10133e]">{selectedCategory.name}</h2>
                        <span className="rounded-full bg-[#f3efff] px-2.5 py-1 text-xs font-extrabold text-[#735fff]">
                          {selectedParent ? `${selectedParent.name} / ${selectedCategory.name}` : '父级目录'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#858caf]">
                        {selectedCategory.description || '这个目录还没有描述'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {selectedCategory.parentId === null && (
                      <Button variant="ghost" className="h-10 rounded-full px-4 font-bold text-[#735fff]" onClick={() => openNew(selectedCategory)}>
                        <FolderPlus className="mr-2 h-4 w-4" /> 添加子类
                      </Button>
                    )}
                    <Button variant="ghost" className="h-10 rounded-full px-4 font-bold text-[#735fff]" onClick={() => openEdit(selectedCategory)}>
                      <Pencil className="mr-2 h-4 w-4" /> 编辑
                    </Button>
                    <Button variant="ghost" className="h-10 rounded-full px-4 font-bold text-red-500" onClick={() => handleDelete(selectedCategory.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> 删除
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
                  <MetricCard label="直接链接" value={selectedDirectLinks} />
                  <MetricCard label="子目录" value={selectedChildren.length} />
                  <MetricCard label="子目录链接" value={selectedChildLinks} />
                  <MetricCard label="权重" value={selectedCategory.weight} />
                </div>

                <div className="mt-6 grid grid-cols-[1fr_240px] gap-4 max-lg:grid-cols-1">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-[#121642]">子目录</h3>
                      <span className="text-xs font-bold text-[#8c93b0]">{selectedChildren.length} 个</span>
                    </div>
                    {selectedChildren.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                        {selectedChildren.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => setSelectedId(child.id)}
                            className="group flex h-16 items-center justify-between rounded-[15px] border border-[#eeeaf8] bg-white/74 px-4 text-left transition-all hover:border-[#d9d0ff] hover:bg-white"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-extrabold text-[#151a42]">{child.name}</span>
                              <span className="mt-1 block text-xs font-bold text-[#8c93b0]">{child._count?.links || 0} 个链接</span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-[#8d82c8] transition-transform group-hover:translate-x-0.5" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[15px] border border-dashed border-[#e2dcf6] bg-[#fbfaff] px-4 py-8 text-center text-sm font-bold text-[#969bb6]">
                        暂无子目录，可以从右上角添加
                      </div>
                    )}
                  </div>

                  <aside className="rounded-[16px] border border-[#eeeaf8] bg-[#fbfaff]/80 p-4">
                    <h3 className="mb-4 text-sm font-extrabold text-[#121642]">目录属性</h3>
                    <PropertyRow label="可见性" value={selectedCategory.property === 1 ? '私有分类' : '公开分类'} privateFlag={selectedCategory.property === 1} />
                    <PropertyRow label="父目录" value={selectedParent?.name || '顶级分类'} />
                    <PropertyRow label="图标类名" value={selectedCategory.fontIcon || '未设置'} />
                    <PropertyRow label="关联总数" value={`${selectedDirectLinks + selectedChildLinks} 个链接`} />
                  </aside>
                </div>
              </>
            ) : (
              <div className="rounded-[15px] border border-dashed border-[#e2dcf6] bg-[#fbfaff] px-4 py-14 text-center text-sm font-bold text-[#969bb6]">
                暂无分类
              </div>
            )}
          </section>
        </div>

        {privateCount > 0 && (
          <p className="mt-5 text-xs font-bold text-[#969bb6]">包含 {privateCount} 个私有分类</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-[22px] border-[#ebe7f8] bg-white/90 shadow-[0_24px_70px_rgba(77,68,124,0.14)] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#121642]">
              {editing ? '编辑分类' : parentId !== '' ? '添加子类' : '添加分类'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="分类名称">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-[13px] border-[#e2dcf6]" required />
            </Field>
            <Field label="父级分类">
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="h-11 w-full rounded-[13px] border border-[#e2dcf6] bg-white px-3 text-[#293054] outline-none">
                <option value="">顶级分类</option>
                {topLevel.filter((category) => category.id !== editing?.id).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </Field>
            <Field label="权重">
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-11 rounded-[13px] border-[#e2dcf6]" />
            </Field>
            <Field label="描述">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-11 rounded-[13px] border-[#e2dcf6]" />
            </Field>
            <Field label="图标 (Font Awesome class)">
              <Input value={fontIcon} onChange={(e) => setFontIcon(e.target.value)} className="h-11 rounded-[13px] border-[#e2dcf6]" placeholder="fa fa-folder-open-o" />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox id="property" checked={property} onCheckedChange={(c) => setProperty(c === true)} />
              <Label htmlFor="property" className="font-bold text-[#293054]">私有分类</Label>
            </div>
            <Button type="submit" disabled={loading} className="h-12 w-full rounded-[14px] bg-gradient-to-r from-[#7868ff] to-[#a24eff] font-extrabold text-white">
              {editing ? '保存修改' : '创建分类'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TreeRow({
  category,
  selected,
  expanded,
  childCount,
  depth,
  onSelect,
  onToggle,
  onAddChild,
  onEdit,
  onDelete,
}: {
  category: Category
  selected: boolean
  expanded?: boolean
  childCount?: number
  depth: 0 | 1
  onSelect: () => void
  onToggle?: () => void
  onAddChild?: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const stop = (event: React.MouseEvent) => event.stopPropagation()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect()
      }}
      className={cn(
        'group flex min-h-12 cursor-pointer items-center gap-2 rounded-[13px] px-3 py-2 transition-all',
        selected ? 'bg-[#f0ebff] text-[#735fff] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]' : 'text-[#293054] hover:bg-[#f8f6ff]',
        depth === 1 && 'min-h-10'
      )}
    >
      {onToggle ? (
        <button
          type="button"
          onClick={(event) => {
            stop(event)
            onToggle()
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8d82c8] hover:bg-white"
          aria-label={expanded ? '收起目录' : '展开目录'}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ) : (
        <span className="h-7 w-7 shrink-0" />
      )}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/76 text-[#735fff]">
        <FolderOpen className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold">{category.name}</span>
        <span className="text-xs font-bold text-[#8c93b0]">
          {depth === 0 ? `${childCount || 0} 个子类 · ` : ''}{category._count?.links || 0} 个链接
        </span>
      </span>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {onAddChild && (
          <button
            type="button"
            onClick={(event) => {
              stop(event)
              onAddChild()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#735fff] hover:bg-white"
            aria-label="添加子类"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            stop(event)
            onEdit()
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#735fff] hover:bg-white"
          aria-label="编辑分类"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            stop(event)
            onDelete()
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:bg-white"
          aria-label="删除分类"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[16px] border border-white/78 bg-white/72 p-5 shadow-[0_18px_42px_rgba(77,68,124,0.06)] backdrop-blur-xl">
      <p className="text-sm font-bold text-[#858caf]">{label}</p>
      <strong className="mt-2 block text-[30px] font-extrabold text-[#121642]">{value}</strong>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[15px] border border-[#eeeaf8] bg-white/72 p-4">
      <p className="text-xs font-extrabold text-[#858caf]">{label}</p>
      <strong className="mt-2 block text-[26px] font-extrabold text-[#121642]">{value}</strong>
    </div>
  )
}

function PropertyRow({ label, value, privateFlag }: { label: string; value: string; privateFlag?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#eeeaf8] py-3 last:border-b-0">
      <span className="text-xs font-extrabold text-[#8c93b0]">{label}</span>
      <span className="inline-flex min-w-0 items-center gap-1.5 text-right text-xs font-extrabold text-[#293054]">
        {privateFlag === true && <Lock className="h-3.5 w-3.5 shrink-0 text-[#735fff]" />}
        {privateFlag === false && <Globe className="h-3.5 w-3.5 shrink-0 text-[#8c93b0]" />}
        <span className="truncate">{value}</span>
      </span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block font-bold text-[#293054]">{label}</Label>
      {children}
    </div>
  )
}
