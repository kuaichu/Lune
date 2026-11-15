'use client'

import { useEffect, useState } from 'react'
import { Save, Settings, Sparkle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState({
    title: 'Lune',
    logo: '',
    subtitle: '',
    keywords: '',
    description: '',
    custom_header: '',
    custom_footer: '',
    link_model: 'direct',
    link_num: '30',
    sidebar_auto_expand: true,
    show_link_status: true,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await fetch('/api/settings/site')
      const data = await res.json()
      if (!cancelled && data.code === 0 && data.data) {
        setSettings((prev) => ({
          ...prev,
          ...data.data,
          link_num: String(data.data.link_num || 30),
          sidebar_auto_expand: data.data.sidebar_auto_expand !== false,
          show_link_status: data.data.show_link_status !== false,
        }))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/settings/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    const data = await res.json()
    setLoading(false)
    if (data.code === 0) {
      toast.success('站点设置已保存')
    } else {
      toast.error('保存失败')
    }
  }

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="relative min-h-[calc(100vh-78px)] overflow-hidden px-8 pb-12 pt-10 max-md:px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_10%,rgba(178,154,255,0.18),transparent_30%),radial-gradient(circle_at_80%_60%,rgba(214,204,255,0.16),transparent_34%)]" />
      <div className="relative mx-auto max-w-[900px]">
        <div className="mb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-admin-line bg-admin-surface/58 px-3 py-1.5 text-xs font-bold text-admin-violet">
            <Sparkle className="h-3.5 w-3.5 text-admin-accent" />
            Site Settings
          </div>
          <h1 className="mt-5 text-[30px] font-extrabold text-admin-ink-strong">站点设置</h1>
          <p className="mt-2 text-[15px] font-semibold text-admin-muted">调整 Lune 的标题、描述与链接展示方式</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[22px] border border-admin-glass/78 bg-admin-surface/72 p-6 shadow-[0_18px_42px_rgba(77,68,124,0.07)] backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-admin-tint text-admin-accent">
              <Settings className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-admin-ink-strong">基本信息</h2>
              <p className="text-sm font-semibold text-admin-muted">这些内容会影响前台展示和元信息</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
            <Field label="站点标题">
              <Input value={settings.title} onChange={(e) => update('title', e.target.value)} className="h-11 rounded-[13px] border-admin-line" />
            </Field>
            <Field label="文字 Logo">
              <Input value={settings.logo} onChange={(e) => update('logo', e.target.value)} className="h-11 rounded-[13px] border-admin-line" />
            </Field>
            <Field label="副标题">
              <Input value={settings.subtitle} onChange={(e) => update('subtitle', e.target.value)} className="h-11 rounded-[13px] border-admin-line" />
            </Field>
            <Field label="关键词">
              <Input value={settings.keywords} onChange={(e) => update('keywords', e.target.value)} className="h-11 rounded-[13px] border-admin-line" />
            </Field>
            <Field label="链接模式">
              <Select
                aria-label="链接模式"
                value={settings.link_model}
                onValueChange={(next) => update('link_model', next)}
                options={[
                  { value: 'direct', label: '直连' },
                  { value: 'click', label: '跳转页面' },
                ]}
              />
            </Field>
            <Field label="每分类显示链接数量">
              <Input type="number" value={settings.link_num} onChange={(e) => update('link_num', e.target.value)} className="h-11 rounded-[13px] border-admin-line" />
            </Field>
          </div>

          <div className="mt-5">
            <Field label="站点描述">
              <Textarea value={settings.description} onChange={(e) => update('description', e.target.value)} className="min-h-28 rounded-[13px] border-admin-line" />
            </Field>
          </div>

          <div className="mt-5 flex items-start gap-2">
            <Checkbox
              id="sidebar-auto-expand"
              checked={settings.sidebar_auto_expand}
              onCheckedChange={(c) => setSettings((prev) => ({ ...prev, sidebar_auto_expand: c === true }))}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="sidebar-auto-expand" className="font-bold text-admin-ink">滚动时自动展开侧栏分组</Label>
              <p className="mt-1 text-sm font-semibold text-admin-muted">首页滚动到某个分类时展开侧栏对应分组，离开后自动收起</p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2">
            <Checkbox
              id="show-link-status"
              checked={settings.show_link_status}
              onCheckedChange={(c) => setSettings((prev) => ({ ...prev, show_link_status: c === true }))}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="show-link-status" className="font-bold text-admin-ink">首页标记失效链接</Label>
              <p className="mt-1 text-sm font-semibold text-admin-muted">探活检测为异常的链接，在首页图标右下角显示一个小红点，访客也能看到</p>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="mt-7 h-12 w-full rounded-[14px] bg-gradient-to-r from-[#7868ff] to-[#a24eff] font-extrabold text-white shadow-[0_14px_30px_rgba(117,94,244,0.22)]">
            <Save className="mr-2 h-4 w-4" />
            保存设置
          </Button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block font-bold text-admin-ink">{label}</Label>
      {children}
    </div>
  )
}
