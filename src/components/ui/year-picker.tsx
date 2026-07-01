'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A calendar-style year picker: click the field to open a popover with a
 * 4×3 grid of years (like the year-view of a date picker) and prev/next
 * decade arrows. Replaces plain `<select>` year dropdowns so choosing a
 * year feels like picking a date rather than "typing it in manually".
 */
export function YearPicker({
  value,
  onChange,
  min,
  max,
}: {
  value: number
  onChange: (year: number) => void
  min?: number
  max?: number
}) {
  const [open, setOpen] = useState(false)
  const [decadeOffset, setDecadeOffset] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  // The decade window always starts centered on `value`, shifted by however
  // many decades the user has paged with the prev/next arrows. Deriving it
  // like this (instead of syncing via useEffect) avoids an extra render.
  const decadeStart = Math.floor(value / 10) * 10 + decadeOffset * 10

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const years = Array.from({ length: 12 }, (_, i) => decadeStart - 1 + i)

  function pick(y: number) {
    if ((min && y < min) || (max && y > max)) return
    onChange(y)
    setDecadeOffset(0)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setDecadeOffset(0); setOpen((o) => !o) }}
        className="select flex items-center justify-between gap-2 text-left"
      >
        <span className="font-semibold">{value}</span>
        <CalendarDays size={16} style={{ color: 'var(--text-muted)' }} />
      </button>

      {open && (
        <div
          className="absolute z-20 mt-2 w-64 p-3 clay-raised animate-fade-in-scale"
          style={{ background: 'var(--bg-card)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setDecadeOffset((d) => d - 1)}
              className="press-effect p-1.5 rounded-full"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Dekade sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {decadeStart} – {decadeStart + 9}
            </span>
            <button
              type="button"
              onClick={() => setDecadeOffset((d) => d + 1)}
              className="press-effect p-1.5 rounded-full"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Dekade berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {years.map((y) => {
              const disabled = (min !== undefined && y < min) || (max !== undefined && y > max)
              const outOfDecade = y < decadeStart || y > decadeStart + 9
              const selected = y === value
              return (
                <button
                  key={y}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(y)}
                  className={cn(
                    'press-effect rounded-[10px] py-2 text-sm font-semibold transition-colors',
                    disabled && 'opacity-30 cursor-not-allowed',
                    outOfDecade && !disabled && 'opacity-50'
                  )}
                  style={
                    selected
                      ? { background: 'var(--accent)', color: '#fff', boxShadow: 'var(--clay-primary)' }
                      : { color: 'var(--text-primary)', background: 'var(--bg-tertiary)' }
                  }
                >
                  {y}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
