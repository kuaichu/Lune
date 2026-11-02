'use client'

import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="w-full">
      <div className="search-band-inner h-12 flex items-center gap-3.5 px-[18px] pl-[26px] rounded-full">
        <Search className="text-purple-primary w-7 h-7 shrink-0" />
        <input
          type="search"
          className="flex-1 border-none bg-transparent text-[15px] text-ink-search placeholder:text-ink-placeholder outline-none"
          placeholder="输入书签关键词进行搜索"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
