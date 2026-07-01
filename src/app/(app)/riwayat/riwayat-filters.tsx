'use client'

import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface Props {
  q: string
  from: string
  to: string
  method: string
}

export function RiwayatFilters({ q, from, to, method }: Props) {
  const router = useRouter()

  function update(next: Partial<Props>) {
    const params = new URLSearchParams()
    const merged = { q, from, to, method, ...next }
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v)
    router.push(`/riwayat?${params.toString()}`)
  }

  return (
    <div className="clay p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
      <div className="relative sm:col-span-2">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          defaultValue={q}
          onKeyDown={(e) => e.key === 'Enter' && update({ q: (e.target as HTMLInputElement).value })}
          placeholder="Cari nama, NIS, atau no. transaksi…"
          className="input pl-10"
        />
      </div>
      <input type="date" defaultValue={from} onChange={(e) => update({ from: e.target.value })} className="input" aria-label="Dari tanggal" />
      <input type="date" defaultValue={to} onChange={(e) => update({ to: e.target.value })} className="input" aria-label="Sampai tanggal" />
      <select value={method} onChange={(e) => update({ method: e.target.value })} className="select sm:col-span-4 sm:w-48">
        <option value="">Semua Metode</option>
        <option value="TUNAI">Tunai</option>
        <option value="TRANSFER">Transfer Bank</option>
        <option value="QRIS">QRIS</option>
      </select>
    </div>
  )
}
