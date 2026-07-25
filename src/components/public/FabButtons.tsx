'use client'

import { Plus, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FabButtonsProps {
  isLoggedIn: boolean
  onAddClick: () => void
  showBackToTop: boolean
}

export function FabButtons({ isLoggedIn, onAddClick, showBackToTop }: FabButtonsProps) {
  const scrollToTop = () => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    window.scrollTo({ top: 0, behavior })
  }

  return (
    <>
      {isLoggedIn && (
        <div className="fixed right-[26px] bottom-[88px] z-[1000]">
          <Button
            size="icon"
            className="fab-main w-[52px] h-[52px] rounded-full transition-[opacity,transform] duration-200 hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            title="快速添加链接"
            onClick={onAddClick}
          >
            <Plus className="w-7 h-7" />
          </Button>
        </div>
      )}

      <div
        className={`fixed right-[26px] bottom-6 z-[1000] transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none ${
          showBackToTop
            ? 'visible pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'invisible pointer-events-none translate-y-1 scale-[0.96] opacity-0'
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="fab-top w-11 h-11 rounded-full hover:bg-white/90"
          onClick={(event) => {
            event.currentTarget.blur()
            scrollToTop()
          }}
          title="返回顶部"
          aria-label="返回顶部"
          aria-hidden={!showBackToTop}
          tabIndex={showBackToTop ? 0 : -1}
        >
          <ArrowUp className="w-7 h-7" style={{ color: 'var(--purple)' }} />
        </Button>
      </div>
    </>
  )
}
