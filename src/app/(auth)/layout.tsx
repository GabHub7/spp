import { LogoMark } from '@/components/app/brand'
import { getSchoolSettingsSafe } from '@/lib/school'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSchoolSettingsSafe()
  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(1200px 600px at 100% -10%, var(--accent-2-light), transparent), radial-gradient(900px 500px at -10% 110%, var(--accent-light), transparent), var(--bg-primary)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <LogoMark size={72} className="mb-3 drop-shadow-sm" logoUrl={settings.logo_url} alt={`Lambang ${settings.school_name}`} />
          <h1 className="brand-wordmark text-2xl font-extrabold">{settings.app_name}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Sistem Informasi Pembayaran SPP · {settings.school_name}
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
