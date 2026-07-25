import { NextRequest, NextResponse } from 'next/server'
import {
  createSessionToken,
  getSessionCookieOptions,
  isAuthConfigured,
  SESSION_COOKIE_NAME,
} from '@/lib/auth'
import { authenticateCredentials } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return NextResponse.json({ code: -2000, err_msg: '用户名或密码不能为空！' })
  }

  if (!isAuthConfigured()) {
    return NextResponse.json(
      { code: -5000, err_msg: '服务端认证未配置，请设置至少 32 字节的 AUTH_SECRET。' },
      { status: 500 }
    )
  }

  const result = await authenticateCredentials(username, password)
  if (!result.success) {
    const code = result.reason === 'not-configured' ? -2000 : -1012
    return NextResponse.json({ code, err_msg: result.error })
  }

  const token = createSessionToken(result.username)
  const response = NextResponse.json({ code: 0, msg: '登录成功' })
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())

  return response
}
