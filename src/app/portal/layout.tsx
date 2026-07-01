import { requireParent } from '@/lib/auth-guard'
import { ParentShell } from '@/components/app/parent-shell'
import { getSchoolSettingsSafe } from '@/lib/school'

export const dynamic = 'force-dynamic'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireParent()
  // cache()-wrapped: shares the single DB round-trip already made by the root layout.
  const settings = await getSchoolSettingsSafe()
  return (
    <ParentShell fullName={user.fullName} appName={settings.app_name} schoolName={settings.school_name} logoUrl={settings.logo_url}>
      {children}
    </ParentShell>
  )
}
