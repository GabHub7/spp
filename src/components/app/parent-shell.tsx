'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, History, LogOut } from 'lucide-react'
import { Brand } from './brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/portal', label: 'Beranda', icon: Home },
  { href: '/portal/riwayat', label: 'Riwayat', icon: History },
]

interface Props {
  fullName: string
  appName?: string
  schoolName?: string
  logoUrl?: string | null
  children: React.ReactNode
}

export function ParentShell({ fullName, appName, schoolName, logoUrl, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string) {
    return href === '/portal' ? pathname === '/portal' : pathname.startsWith(href)
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      <header
        className="sticky top-0 z-30 border-b backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <Brand collapsed appName={appName} schoolName={schoolName} logoUrl={logoUrl} />
          <div className="flex-1" />
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <div className="grid place-items-center w-9 h-9 rounded-full text-xs font-bold text-white" style={{ background: 'var(--grad-brand)' }}>
              {getInitials(fullName)}
            </div>
            <button onClick={logout} className="press-effect p-2 rounded-full" style={{ color: 'var(--text-secondary)' }} aria-label="Keluar">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        {/* segmented nav */}
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-2">
          {NAV.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-[14px] text-sm font-semibold press-effect')}
                style={
                  active
                    ? { background: 'var(--accent)', color: '#fff', boxShadow: 'var(--clay-primary)' }
                    : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
                }
              >
                <Icon size={16} /> {item.label}
              </Link>
            )
          })}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 page-enter" key={pathname}>
        {children}
      </main>
    </div>
  )
}
