import { NextResponse } from 'next/server'
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ code: 0, msg: '已退出' })
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...getSessionCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  })
  return response
}
