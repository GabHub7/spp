'use client'

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Check, X, ExternalLink, AlertTriangle, Search, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDateTime, billLabel, PAYMENT_METHOD_LABEL } from '@/lib/utils'
import { reviewPayment } from './actions'
import type { PendingPayment } from './page'
import type { SchoolClass } from '@/types'

export function VerifikasiClient({ payments, classes }: { payments: PendingPayment[]; classes: SchoolClass[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [proof, setProof] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')

  const hasFilters = !!(query || classFilter || methodFilter)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return payments.filter((p) => {
      if (classFilter && p.students?.class_id !== classFilter) return false
      if (methodFilter && p.method !== methodFilter) return false
      if (!q) return true
      return (
        (p.students?.full_name ?? '').toLowerCase().includes(q) ||
        (p.students?.nis ?? '').toLowerCase().includes(q) ||
        p.transaction_no.toLowerCase().includes(q)
      )
    })
  }, [payments, query, classFilter, methodFilter])

  function resetFilters() {
    setQuery('')
    setClassFilter('')
    setMethodFilter('')
  }

  function act(id: string, approve: boolean) {
    if (!approve && !confirm('Tolak pembayaran ini? Tagihan akan kembali berstatus belum bayar.')) return
    setError(null)
    start(async () => {
      const res = await reviewPayment(id, approve)
      if (res.error) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Verifikasi Pembayaran" description={`${payments.length} pembayaran online menunggu verifikasi`} />

      {error && (
        <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="clay p-4 flex flex-col gap-3">
        <div className="filter-bar">
          <div className="relative filter-search">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, NIS, atau no. transaksi…"
              className="input pl-10"
            />
          </div>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="select filter-select">
            <option value="">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="select filter-select">
            <option value="">Semua Metode</option>
            <option value="TRANSFER">Transfer Bank</option>
            <option value="QRIS">QRIS</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Menampilkan <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{filtered.length}</span> dari {payments.length} pengajuan
          </p>
          {hasFilters && (
            <button onClick={resetFilters} className="btn btn-ghost btn-sm"><RotateCcw size={13} /> Reset Filter</button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="clay">
          <EmptyState
            icon={BadgeCheck}
            title={payments.length === 0 ? 'Tidak ada yang perlu diverifikasi' : 'Tidak ada hasil'}
            description={payments.length === 0 ? 'Semua pembayaran online sudah diproses.' : 'Tidak ada pengajuan yang cocok dengan filter.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="clay p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{p.students?.full_name ?? '—'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {p.students?.nis} · {p.students?.classes?.name ?? '—'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {p.bills ? billLabel(p.bills) : ''} · {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                  </p>
                  <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{p.transaction_no}</p>
                </div>
                <p className="text-lg font-extrabold shrink-0" style={{ color: 'var(--accent)' }}>{formatCurrency(Number(p.amount))}</p>
              </div>

              {p.note && <p className="text-xs mt-2 italic" style={{ color: 'var(--text-secondary)' }}>“{p.note}”</p>}

              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(p.created_at)}</span>
                {p.proof_url && (
                  <button onClick={() => setProof(p.proof_url)} className="btn btn-ghost btn-sm"><ExternalLink size={14} /> Lihat Bukti</button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={() => act(p.id, false)} className="btn btn-secondary" disabled={pending}><X size={16} /> Tolak</button>
                <button onClick={() => act(p.id, true)} className="btn btn-primary" disabled={pending}><Check size={16} /> Verifikasi</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!proof} onClose={() => setProof(null)} title="Bukti Pembayaran" size="lg">
        {proof && (
          proof.toLowerCase().endsWith('.pdf') ? (
            <a href={proof} target="_blank" rel="noopener noreferrer" className="btn btn-primary"><ExternalLink size={16} /> Buka PDF</a>
          ) : (
            <img src={proof} alt="Bukti pembayaran" className="w-full rounded-[14px]" />
          )
        )}
      </Modal>
    </div>
  )
}
