import type { Metadata } from 'next'
import { getSession } from '@/lib/auth-guard'
import { getParentChildren, getActiveYear } from '@/lib/queries'
import { PortalClient } from './portal-client'
import type { PaymentSettings } from '@/types'

export const metadata: Metadata = { title: 'Beranda Orang Tua' }

export default async function PortalPage() {
  const ctx = await getSession()
  if (!ctx) return null
  const { user, serviceClient } = ctx

  const [children, settingsRes, year] = await Promise.all([
    getParentChildren(serviceClient, user.id),
    serviceClient.from('payment_settings').select('*').eq('id', 1).maybeSingle(),
    getActiveYear(serviceClient),
  ])

  return (
    <PortalClient
      fullName={user.fullName}
      kids={children}
      settings={(settingsRes.data ?? null) as PaymentSettings | null}
      yearName={year?.name ?? null}
    />
  )
}
