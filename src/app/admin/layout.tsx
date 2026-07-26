import { AdminShell } from '@/components/admin/AdminShell'
import { requireAdminPageSession } from '@/lib/auth-server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminPageSession()

  return (
    <AdminShell>{children}</AdminShell>
  )
}
