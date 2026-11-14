import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApiSession } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminApiSession(request)
  if (unauthorized) return unauthorized

  const option = await prisma.option.findUnique({ where: { key: 's_site' } })
  let settings = null
  if (option?.value) {
    try {
      settings = JSON.parse(option.value)
    } catch {
      settings = { title: 'Lune' }
    }
  }
  return NextResponse.json({ code: 0, data: settings })
}

export async function PUT(request: NextRequest) {
  const unauthorized = requireAdminApiSession(request)
  if (unauthorized) return unauthorized

  const body = await request.json()
  const value = JSON.stringify({
    title: body.title || 'Lune',
    logo: body.logo || '',
    subtitle: body.subtitle || '',
    keywords: body.keywords || '',
    description: body.description || '',
    custom_header: body.custom_header || '',
    custom_footer: body.custom_footer || '',
    link_model: body.link_model || 'direct',
    link_num: body.link_num || 30,
    sidebar_auto_expand: body.sidebar_auto_expand !== false,
  })

  await prisma.option.upsert({
    where: { key: 's_site' },
    update: { value },
    create: { key: 's_site', value },
  })

  return NextResponse.json({ code: 0 })
}
