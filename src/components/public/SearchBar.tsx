'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  /** Number of matching links while a query is active, otherwise null. */
  resultCount: number | null
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const subscribeNothing = () => () => {}
const isApplePlatform = () => /Mac|iPhone|iPad/.test(navigator.platform)

export function SearchBar({ value, onChange, resultCount }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Server and first client render both report false, so hydration matches.
  const isApple = useSyncExternalStore(subscribeNothing, isApplePlatform, () => false)
  const shortcutLabel = isApple ? '⌘ K' : 'Ctrl K'

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPaletteKey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey
      if (!isPaletteKey && !(isSlash && !isTypingTarget(event.target))) return

      event.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const hasValue = value.length > 0

  return (
    <div className="w-full">
      <div className="search-band-inner h-12 flex items-center gap-3.5 px-[18px] pl-[26px] rounded-full transition-shadow focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_28%,transparent)]">
        <Search className="text-purple-primary w-7 h-7 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          aria-label="搜索书签"
          className="flex-1 min-w-0 border-none bg-transparent text-[15px] text-ink-search placeholder:text-ink-placeholder outline-none"
          placeholder="输入书签关键词进行搜索"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return
            if (hasValue) onChange('')
            else e.currentTarget.blur()
          }}
        />
        {resultCount !== null && (
          <span aria-live="polite" className="shrink-0 text-xs font-semibold text-ink-muted">
            {resultCount} 个结果
          </span>
        )}
        {hasValue ? (
          <button
            type="button"
            aria-label="清除搜索"
            title="清除搜索（Esc）"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-hover-tint hover:text-purple-primary"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-muted md:inline-block"
          >
            {shortcutLabel}
          </kbd>
        )}
      </div>
    </div>
  )
}
