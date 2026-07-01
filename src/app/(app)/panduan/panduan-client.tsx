'use client'

import { useMemo, useState } from 'react'
import { Search, HelpCircle, ChevronRight, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { NAV_SECTIONS } from '@/components/app/nav-config'
import { cn } from '@/lib/utils'
import type { PageGuide } from '@/lib/guides'

type Guide = PageGuide & { path: string }

// Reuse the sidebar icons so each guide in the list matches its page's icon.
const ICON_BY_PATH = new Map(NAV_SECTIONS.flatMap((s) => s.items).map((i) => [i.href, i.icon]))

export function PanduanClient({ guides }: { guides: Guide[] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string>(guides[0]?.path ?? '/')

  const q = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return guides
    return guides.filter((g) => {
      if (g.title.toLowerCase().includes(q)) return true
      if (g.intro.toLowerCase().includes(q)) return true
      return g.sections.some(
        (s) => s.heading.toLowerCase().includes(q) || s.points.some((p) => p.toLowerCase().includes(q))
      )
    })
  }, [guides, q])

  // Keep the detail pane pointed at something visible whenever the search
  // narrows (or clears) the list.
  const active = filtered.find((g) => g.path === selected) ?? filtered[0] ?? null

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Panduan Penggunaan"
        description="Cari dan pelajari cara menggunakan setiap halaman PoncolPay."
      />

      <div className="clay p-3">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari panduan… misal “import excel” atau “verifikasi”"
            className="input pl-10 pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="press-effect absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Bersihkan pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
        {/* Page list */}
        <div className="clay overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={HelpCircle} title="Tidak ditemukan" description="Coba kata kunci lain." />
          ) : (
            <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible no-scrollbar p-2 gap-1">
              {filtered.map((g) => {
                const Icon = ICON_BY_PATH.get(g.path) ?? HelpCircle
                const isActive = active?.path === g.path
                return (
                  <button
                    key={g.path}
                    onClick={() => setSelected(g.path)}
                    className={cn(
                      'press-effect shrink-0 flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-sm font-semibold text-left transition-colors whitespace-nowrap lg:whitespace-normal',
                      isActive ? 'text-white' : 'hover:bg-[var(--bg-tertiary)]'
                    )}
                    style={
                      isActive
                        ? { background: 'var(--accent)', boxShadow: 'var(--clay-primary)' }
                        : { color: 'var(--text-secondary)' }
                    }
                  >
                    <Icon size={17} strokeWidth={2.2} className="shrink-0" />
                    <span className="flex-1">{g.title}</span>
                    <ChevronRight size={14} className="hidden lg:block shrink-0 opacity-60" />
                  </button>
                )
              })}
            </nav>
          )}
        </div>

        {/* Guide detail */}
        <div className="clay p-5 lg:p-6 min-w-0">
          {!active ? (
            <EmptyState icon={HelpCircle} title="Pilih halaman" description="Pilih salah satu halaman di daftar untuk melihat panduannya." />
          ) : (
            <>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{active.title}</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>{active.intro}</p>
              <div className="flex flex-col gap-5">
                {active.sections.map((section) => (
                  <div key={section.heading}>
                    <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--accent)' }}>{section.heading}</h3>
                    <ul className="flex flex-col gap-1.5">
                      {section.points.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent-2)' }} />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
