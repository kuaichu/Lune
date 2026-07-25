'use client'

import { Plus, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FabButtonsProps {
  isLoggedIn: boolean
  onAddClick: () => void
  showBackToTop: boolean
}

export function FabButtons({ isLoggedIn, onAddClick, showBackToTop }: FabButtonsProps) {
  return (
    <>
      {isLoggedIn && (
        <div className="fixed right-[26px] bottom-[88px] z-[1000]">
          <Button
            size="icon"
            className="fab-main w-[52px] h-[52px] rounded-full hover:opacity-90"
            title="快速添加链接"
            onClick={onAddClick}
          >
            <Plus className="w-7 h-7" />
          </Button>
        </div>
      )}

      {showBackToTop && (
        <div className="fixed right-[26px] bottom-6 z-[1000]">
          <Button
            variant="ghost"
            size="icon"
            className="fab-top w-11 h-11 rounded-full hover:bg-white/90"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title="返回顶部"
          >
            <ArrowUp className="w-7 h-7" style={{ color: 'var(--purple)' }} />
          </Button>
        </div>
      )}
    </>
  )
}
