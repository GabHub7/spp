import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'red' | 'orange' | 'green' | 'neutral'
  hint?: string
}

const TONES: Record<string, { bg: string; fg: string }> = {
  red: { bg: 'var(--accent-light)', fg: 'var(--accent)' },
  orange: { bg: 'var(--accent-2-light)', fg: 'var(--accent-2)' },
  green: { bg: 'rgba(22,163,74,0.12)', fg: '#15803d' },
  neutral: { bg: 'var(--bg-tertiary)', fg: 'var(--text-secondary)' },
}

export function StatCard({ label, value, icon: Icon, tone = 'neutral', hint }: StatCardProps) {
  const t = TONES[tone]
  return (
    <div className="clay p-5 hover-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </p>
          <p className="text-2xl font-extrabold mt-1.5 truncate" style={{ color: 'var(--text-primary)' }}>
            {value}
          </p>
          {hint && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {hint}
            </p>
          )}
        </div>
        <div
          className="grid place-items-center w-11 h-11 rounded-[14px] shrink-0"
          style={{ background: t.bg, color: t.fg }}
        >
          <Icon size={20} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  )
}
