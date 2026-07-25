import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth'

const PUBLIC_API_PATHS = new Set(['/api/auth/login', '/api/auth/logout'])

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes and admin routes require auth
  const isAdmin = pathname.startsWith('/admin')
  const isApi = pathname.startsWith('/api')

  if (isAdmin || isApi) {
    // Skip auth for public API routes
    if (PUBLIC_API_PATHS.has(pathname)) {
      return NextResponse.next()
    }

    const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)
    if (!session) {
      if (isApi) {
        return NextResponse.json({ code: -1, err_msg: '未登录' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
