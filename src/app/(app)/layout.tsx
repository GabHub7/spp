import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth-guard'
import { AppShell } from '@/components/app/app-shell'
import { getSchoolSettingsSafe } from '@/lib/school'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession()
  // Parents use the dedicated portal, not the staff backoffice.
  if (user.role === 'ORANG_TUA') redirect('/portal')
  // cache()-wrapped: shares the single DB round-trip already made by the root layout.
  const settings = await getSchoolSettingsSafe()
  return (
    <AppShell
      role={user.role}
      fullName={user.fullName}
      username={user.username}
      appName={settings.app_name}
      schoolName={settings.school_name}
      logoUrl={settings.logo_url}
    >
      {children}
    </AppShell>
  )
}
