'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, FileText, Sparkle, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ParsedBookmark {
  title: string
  url: string
  category: string
}

export default function ImportPage() {
  const router = useRouter()
  const [bookmarks, setBookmarks] = useState<ParsedBookmark[]>([])
  const [loading, setLoading] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<{ id: number; name: string; parentId: number | null }[]>([])
  const categoryOptions = useMemo(() => {
    const categoryById = new Map(categories.map((category) => [category.id, category]))
    return categories.map((category) => ({
      id: category.id,
      name: category.parentId === null
        ? category.name
        : categoryById.has(category.parentId)
          ? `${categoryById.get(category.parentId)!.name} / ${category.name}`
          : category.name,
    }))
  }, [categories])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/html')
    const items: ParsedBookmark[] = []

    const dts = doc.querySelectorAll('DT')
    let currentCategory = ''

    dts.forEach((dt) => {
      const h3 = dt.querySelector('H3')
      if (h3) {
        currentCategory = h3.textContent || ''
        return
      }
      const a = dt.querySelector('A')
      if (a) {
        items.push({
          title: a.textContent || '',
          url: a.getAttribute('HREF') || '',
          category: currentCategory,
        })
      }
    })

    setBookmarks(items)

    const res = await fetch('/api/categories')
    const data = await res.json()
    if (data.code === 0) setCategories(data.data)

    toast.success(`解析到 ${items.length} 个书签`)
  }

  async function handleImport() {
    if (bookmarks.length === 0) return
    if (!categoryId) {
      toast.error('请先选择目标分类')
      return
    }
    setLoading(true)

    let count = 0
    for (const bm of bookmarks) {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bm.title,
          url: bm.url,
          categoryId: Number(categoryId),
        }),
      })
      const data = await res.json()
      if (data.code === 0) count++
    }

    setLoading(false)
    toast.success(`成功导入 ${count} 个书签`)
    router.push('/admin/links')
  }

  return (
    <div className="relative min-h-[calc(100vh-78px)] overflow-hidden px-8 pb-12 pt-10 max-md:px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_10%,rgba(178,154,255,0.18),transparent_30%),radial-gradient(circle_at_80%_60%,rgba(214,204,255,0.16),transparent_34%)]" />
      <div className="relative mx-auto max-w-[1100px]">
        <div className="mb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ebe7f8] bg-white/58 px-3 py-1.5 text-xs font-bold text-[#827ab5]">
            <Sparkle className="h-3.5 w-3.5 text-[#7b68ff]" />
            Import
          </div>
          <h1 className="mt-5 text-[30px] font-extrabold text-[#10133e]">书签导入</h1>
          <p className="mt-2 text-[15px] font-semibold text-[#858caf]">从浏览器导出的 HTML 文件导入到 Lune</p>
        </div>

        <section className="mb-6 rounded-[22px] border border-white/78 bg-white/72 p-8 shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-[#ded6ff] bg-[#fbfaff] px-6 py-14 text-center transition-all hover:border-[#bcaeff] hover:bg-[#f7f4ff]">
            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0ebff] text-[#735fff] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <Upload className="h-8 w-8" />
            </span>
            <span className="text-lg font-extrabold text-[#121642]">选择书签 HTML 文件</span>
            <span className="mt-2 text-sm font-semibold text-[#858caf]">支持 Chrome / Edge / Firefox 导出的 .html 或 .htm 文件</span>
            <input type="file" accept=".html,.htm" onChange={handleFile} className="sr-only" />
          </label>
        </section>

        {bookmarks.length > 0 && (
          <>
            <section className="mb-6 rounded-[22px] border border-white/78 bg-white/72 p-6 shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
                <div>
                  <h2 className="text-lg font-extrabold text-[#121642]">导入预览</h2>
                  <p className="mt-1 text-sm font-semibold text-[#858caf]">解析到 {bookmarks.length} 个书签，预览前 50 个</p>
                </div>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="h-11 rounded-[13px] border border-[#e2dcf6] bg-white px-4 text-sm font-bold text-[#697193] outline-none"
                >
                  <option value="">选择目标分类</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                {bookmarks.slice(0, 50).map((bm, i) => (
                  <div key={`${bm.url}-${i}`} className="flex items-center gap-3 rounded-[13px] bg-[#fbfaff] p-3 text-sm">
                    <CheckCircle className="h-4 w-4 shrink-0 text-[#735fff]" />
                    <FileText className="h-4 w-4 shrink-0 text-[#9a91c7]" />
                    <span className="min-w-0 flex-1 truncate font-extrabold text-[#151a42]">{bm.title}</span>
                    <span className="min-w-0 max-w-[45%] truncate text-xs font-semibold text-[#858caf]">{bm.url}</span>
                  </div>
                ))}
                {bookmarks.length > 50 && (
                  <p className="py-3 text-center text-sm font-bold text-[#858caf]">
                    还有 {bookmarks.length - 50} 个书签将在导入时处理
                  </p>
                )}
              </div>
            </section>

            {categories.length === 0 && (
              <p className="mb-4 text-center text-sm font-semibold text-[#858caf]">当前没有分类，请先前往分类管理创建分类。</p>
            )}
            <Button onClick={handleImport} disabled={loading || !categoryId || categories.length === 0} className="h-12 w-full rounded-[14px] bg-gradient-to-r from-[#7868ff] to-[#a24eff] font-extrabold text-white shadow-[0_14px_30px_rgba(117,94,244,0.22)]">
              {loading ? `正在导入 ${bookmarks.length} 个书签...` : `导入 ${bookmarks.length} 个书签`}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
