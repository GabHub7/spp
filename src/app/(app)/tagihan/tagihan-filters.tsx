'use client'

import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { monthName, BILL_TYPE_LABEL } from '@/lib/utils'

interface Props {
  periods: { month: number; year: number }[]
  month: number
  periodYear: number
  status: string
  jenis: string
  q: string
}

export function TagihanFilters({ periods, month, periodYear, status, jenis, q }: Props) {
  const router = useRouter()

  function update(next: Partial<{ month: number; year: number; status: string; jenis: string; q: string }>) {
    const params = new URLSearchParams()
    const m = next.month ?? month
    const y = next.year ?? periodYear
    const s = next.status ?? status
    const j = next.jenis ?? jenis
    const query = next.q ?? q
    params.set('jenis', j)
    if (j === 'SPP') {
      params.set('month', String(m))
      params.set('year', String(y))
    }
    if (s) params.set('status', s)
    if (query) params.set('q', query)
    router.push(`/tagihan?${params.toString()}`)
  }

  return (
    <div className="clay p-4 flex flex-col sm:flex-row flex-wrap gap-3">
      <div className="relative flex-1 min-w-[180px]">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          defaultValue={q}
          onKeyDown={(e) => { if (e.key === 'Enter') update({ q: (e.target as HTMLInputElement).value }) }}
          placeholder="Cari NIS atau nama, tekan Enter…"
          className="input pl-10"
        />
      </div>
      <select value={jenis} onChange={(e) => update({ jenis: e.target.value })} className="select sm:w-44">
        {Object.entries(BILL_TYPE_LABEL).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      {jenis === 'SPP' && (
        <select
          value={`${month}-${periodYear}`}
          onChange={(e) => {
            const [m, y] = e.target.value.split('-').map(Number)
            update({ month: m, year: y })
          }}
          className="select sm:w-48"
        >
          {periods.map((p) => (
            <option key={`${p.month}-${p.year}`} value={`${p.month}-${p.year}`}>
              {monthName(p.month)} {p.year}
            </option>
          ))}
        </select>
      )}
      <select value={status} onChange={(e) => update({ status: e.target.value })} className="select sm:w-40">
        <option value="">Semua Status</option>
        <option value="UNPAID">Belum Bayar</option>
        <option value="PARTIAL">Cicilan</option>
        <option value="PAID">Lunas</option>
      </select>
    </div>
  )
}
