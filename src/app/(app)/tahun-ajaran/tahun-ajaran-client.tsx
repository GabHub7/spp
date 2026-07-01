'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, CalendarRange, CheckCircle2, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { YearPicker } from '@/components/ui/year-picker'
import { createYear, setActiveYear } from './actions'
import type { AcademicYear } from '@/types'

function nextStartYear(existing: AcademicYear[]): number {
  const years = existing
    .map((y) => { const m = y.name.match(/^(\d{4})\/\d{4}$/); return m ? parseInt(m[1]) : 0 })
    .filter(Boolean)
    .sort((a, b) => b - a)
  return years.length > 0 ? years[0] + 1 : new Date().getFullYear()
}

export function TahunAjaranClient({ years }: { years: AcademicYear[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [startYear, setStartYear] = useState(new Date().getFullYear())
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const name = `${startYear}/${startYear + 1}`
  // Bounds always widen to include startYear itself — otherwise a school
  // with academic years already stretching a few years out (or an unusual
  // system clock) would compute a default that has no matching <option>,
  // leaving the dropdown showing nothing selected while the preview below
  // still displays that unselectable year.
  const currentYear = new Date().getFullYear()
  const rangeStart = Math.min(currentYear - 2, startYear - 2)
  const rangeEnd = Math.max(currentYear + 7, startYear + 2)

  function submit() {
    setError(null)
    start(async () => {
      const res = await createYear({ name, is_active: active })
      if (res.error) setError(res.error)
      else { setOpen(false); router.refresh() }
    })
  }

  function activate(id: string) {
    start(async () => {
      const res = await setActiveYear(id)
      if (res.error) alert(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tahun Ajaran"
        description="Hanya satu tahun ajaran yang boleh aktif"
        actions={<button onClick={() => { setStartYear(nextStartYear(years)); setActive(true); setError(null); setOpen(true) }} className="btn btn-primary btn-sm"><Plus size={16} /> Tambah Tahun Ajaran</button>}
      />
      <div className="clay overflow-hidden">
        {years.length === 0 ? (
          <EmptyState icon={CalendarRange} title="Belum ada tahun ajaran" />
        ) : (
          <table className="data-table">
            <thead><tr><th>Tahun Ajaran</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.id}>
                  <td className="font-semibold">{y.name}</td>
                  <td>
                    {y.is_active
                      ? <span className="badge status-success"><CheckCircle2 size={13} /> Aktif</span>
                      : <span className="badge status-neutral">Arsip</span>}
                  </td>
                  <td className="text-right">
                    {!y.is_active && (
                      <button onClick={() => activate(y.id)} className="btn btn-ghost btn-sm" disabled={pending}>Aktifkan</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Tahun Ajaran">
        {error && (
          <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Tahun Mulai</label>
            <YearPicker value={startYear} onChange={setStartYear} min={rangeStart} max={rangeEnd} />
          </div>
          <div className="clay-pressed px-4 py-3 text-center">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tahun Ajaran</p>
            <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{name}</p>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Jadikan tahun ajaran aktif</span>
          </label>
        </div>
        <div className="form-actions">
          <button onClick={() => setOpen(false)} className="btn btn-secondary">Batal</button>
          <button onClick={submit} className="btn btn-primary" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </Modal>
    </div>
  )
}
