'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

const DEFAULT_CLASS =
  'w-[42px] h-[42px] rounded-full bg-transparent hover:bg-white/15 hover:shadow-[0_8px_18px_rgba(35,30,130,0.16)] text-white'

export function ThemeToggle({ className = DEFAULT_CLASS }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()

  function toggle() {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark'
    const root = document.documentElement
    const apply = () => {
      // Flip the class inside the transition callback so the browser snapshots old and new states;
      // next-themes applies the same class again afterwards, which is a no-op.
      root.classList.toggle('dark', next === 'dark')
      root.style.colorScheme = next
      setTheme(next)
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || typeof document.startViewTransition !== 'function') {
      apply()
      return
    }
    document.startViewTransition(apply)
  }

  // Both icons render and CSS picks one, so SSR and hydration agree without a mounted check.
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggle}
      aria-label="切换深色模式"
      title="切换深色模式"
    >
      <Moon className="h-[22px] w-[22px] dark:hidden" />
      <Sun className="hidden h-[22px] w-[22px] dark:block" />
    </Button>
  )
}
