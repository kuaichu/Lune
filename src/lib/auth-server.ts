import 'server-only'

import bcrypt from 'bcryptjs'
import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { type NextRequest, NextResponse } from 'next/server'

import { prisma } from './prisma'
import { SESSION_COOKIE_NAME, type Session, verifySessionToken } from './auth'

export type CredentialAuthenticationResult =
  | { success: true; username: string }
  | { success: false; reason: 'invalid' | 'not-configured'; error: string }

export async function authenticateCredentials(
  username: string,
  password: string
): Promise<CredentialAuthenticationResult> {
  const [usernameOption, passwordOption] = await Promise.all([
    prisma.option.findUnique({ where: { key: 'username' } }),
    prisma.option.findUnique({ where: { key: 'user_password' } }),
  ])

  if (!usernameOption || !passwordOption) {
    return {
      success: false,
      reason: 'not-configured',
      error: '系统未初始化，请先运行数据迁移脚本。',
    }
  }

  if (username !== usernameOption.value) {
    return { success: false, reason: 'invalid', error: '用户名或密码错误！' }
  }

  const storedHash = passwordOption.value
  const isLegacyMd5 = /^[a-f0-9]{32}$/i.test(storedHash)

  if (isLegacyMd5) {
    const computedMd5 = createHash('md5').update(username + password).digest('hex')
    if (computedMd5 !== storedHash) {
      return { success: false, reason: 'invalid', error: '用户名或密码错误！' }
    }

    const bcryptHash = await bcrypt.hash(password, 10)
    await prisma.option.update({
      where: { key: 'user_password' },
      data: { value: bcryptHash },
    })
  } else {
    const validPassword = await bcrypt.compare(password, storedHash)
    if (!validPassword) {
      return { success: false, reason: 'invalid', error: '用户名或密码错误！' }
    }
  }

  return { success: true, username: usernameOption.value }
}

export async function getCurrentSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}

export function requireAdminApiSession(request: NextRequest): NextResponse | null {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)
  if (session) return null

  return NextResponse.json({ code: -1, err_msg: '未登录' }, { status: 401 })
}

export async function requireAdminPageSession(): Promise<Session> {
  const session = await getCurrentSession()
  if (!session) redirect('/login')
  return session
}
