/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils'

/** The school crest. Falls back to the default mark when no custom logo is configured. */
export function LogoMark({
  size = 40,
  className,
  logoUrl,
  alt = 'Lambang sekolah',
}: {
  size?: number
  className?: string
  logoUrl?: string | null
  alt?: string
}) {
  return (
    <img
      src={logoUrl || '/logo.png'}
      alt={alt}
      width={size}
      height={size * (243 / 208)}
      className={cn('select-none', className)}
      style={{ height: 'auto', maxHeight: size * (243 / 208), objectFit: 'contain' }}
      draggable={false}
    />
  )
}

export function Brand({
  collapsed = false,
  appName = 'PoncolPay',
  schoolName = 'SMK Poncol Jakarta',
  logoUrl,
}: {
  collapsed?: boolean
  appName?: string
  schoolName?: string
  logoUrl?: string | null
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <LogoMark size={collapsed ? 34 : 38} logoUrl={logoUrl} alt={`Lambang ${schoolName}`} />
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="brand-wordmark text-base font-extrabold truncate">{appName}</p>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {schoolName}
          </p>
        </div>
      )}
    </div>
  )
}
