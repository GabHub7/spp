'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { PanelLeft, X, LogOut } from 'lucide-react'
import { navForRole } from './nav-config'
import { Brand } from './brand'
import { PanduanButton } from './panduan-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials, ROLE_LABEL } from '@/lib/utils'
import type { RoleName } from '@/types'

interface Props {
  role: RoleName
  fullName: string
  username: string
  appName: string
  schoolName: string
  logoUrl: string | null
  children: React.ReactNode
}

export function AppShell({ role, fullName, username, appName, schoolName, logoUrl, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const sections = navForRole(role)

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const nav = (
    <nav className="flex flex-col gap-6 px-3 py-2">
      {sections.map((section) => (
        <div key={section.title}>
          <p
            className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {section.title}
          </p>
          <div className="flex flex-col gap-1">
            {section.items.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'press-effect flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-semibold transition-colors',
                    active ? 'text-white' : 'hover:bg-[var(--bg-tertiary)]'
                  )}
                  style={
                    active
                      ? { background: 'var(--accent)', boxShadow: 'var(--clay-primary)' }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  <Icon size={18} strokeWidth={2.2} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <Brand appName={appName} schoolName={schoolName} logoUrl={logoUrl} />
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar py-3">{nav}</div>
        <UserFooter fullName={fullName} username={username} role={role} onLogout={logout} />
      </aside>

      {/* ── Mobile drawer ── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative w-72 max-w-[80%] flex flex-col animate-fade-in-scale"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border)' }}
            >
              <Brand appName={appName} schoolName={schoolName} logoUrl={logoUrl} />
              <button
                onClick={() => setOpen(false)}
                className="press-effect p-2 rounded-full"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Tutup menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar py-3">{nav}</div>
            <UserFooter fullName={fullName} username={username} role={role} onLogout={logout} />
          </aside>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="lg:pl-64">
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-7 h-16 border-b backdrop-blur"
          style={{ background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden press-effect p-2 rounded-[12px]"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Buka menu"
          >
            <PanelLeft size={20} />
          </button>
          <div className="lg:hidden">
            <Brand collapsed appName={appName} schoolName={schoolName} logoUrl={logoUrl} />
          </div>
          <div className="flex-1" />
          <PanduanButton />
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {fullName}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {ROLE_LABEL[role]}
              </p>
            </div>
            <div
              className="grid place-items-center w-10 h-10 rounded-full text-sm font-bold text-white"
              style={{ background: 'var(--grad-brand)' }}
            >
              {getInitials(fullName)}
            </div>
          </div>
        </header>

        <main className="px-4 lg:px-7 py-6 max-w-[1400px] mx-auto page-enter" key={pathname}>
          {children}
        </main>
      </div>
    </div>
  )
}

function UserFooter({
  fullName,
  username,
  role,
  onLogout,
}: {
  fullName: string
  username: string
  role: RoleName
  onLogout: () => void
}) {
  return (
    <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="clay-pressed flex items-center gap-3 p-2.5 mb-2">
        <div
          className="grid place-items-center w-9 h-9 rounded-full text-xs font-bold text-white shrink-0"
          style={{ background: 'var(--grad-brand)' }}
        >
          {getInitials(fullName)}
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {fullName}
          </p>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
            @{username} · {ROLE_LABEL[role]}
          </p>
        </div>
      </div>
      <button onClick={onLogout} className="btn btn-ghost w-full justify-start text-sm">
        <LogOut size={16} /> Keluar
      </button>
    </div>
  )
}
