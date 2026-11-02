'use client'

import { usePathname } from 'next/navigation'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

// Admin and login pages are light-only; the dark palette covers the public homepage.
function isLightOnlyPath(pathname: string) {
  return pathname === '/login' || pathname === '/admin' || pathname.startsWith('/admin/')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={isLightOnlyPath(pathname) ? 'light' : undefined}
    >
      {children}
    </NextThemesProvider>
  )
}
