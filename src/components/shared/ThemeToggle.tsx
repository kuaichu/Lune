'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  // Both icons render and CSS picks one, so SSR and hydration agree without a mounted check.
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-[42px] h-[42px] rounded-full bg-transparent hover:bg-white/15 hover:shadow-[0_8px_18px_rgba(35,30,130,0.16)] text-white"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="切换深色模式"
      title="切换深色模式"
    >
      <Moon className="h-[22px] w-[22px] dark:hidden" />
      <Sun className="hidden h-[22px] w-[22px] dark:block" />
    </Button>
  )
}
