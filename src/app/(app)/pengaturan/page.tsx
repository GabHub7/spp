import type { Metadata } from 'next'
import { getSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { PengaturanClient } from './pengaturan-client'
import { getSchoolSettings } from '@/lib/school'
import type { PaymentSettings, RoleName } from '@/types'

export const metadata: Metadata = { title: 'Pengaturan' }

interface UserRow {
  id: string
  username: string
  full_name: string
  email: string | null
  status: string
  roles: { name: RoleName } | null
}

export default async function PengaturanPage() {
  const ctx = await getSession()
  if (!ctx || ctx.user.role !== 'ADMIN') redirect('/')
  const { serviceClient, user } = ctx

  const [settingsRes, usersRes, schoolSettings] = await Promise.all([
    serviceClient.from('payment_settings').select('*').eq('id', 1).maybeSingle(),
    serviceClient.from('users').select('id, username, full_name, email, status, roles(name)').order('created_at'),
    getSchoolSettings(serviceClient),
  ])

  return (
    <PengaturanClient
      settings={(settingsRes.data ?? null) as PaymentSettings | null}
      users={(usersRes.data ?? []) as unknown as UserRow[]}
      currentUserId={user.id}
      schoolSettings={schoolSettings}
    />
  )
}
