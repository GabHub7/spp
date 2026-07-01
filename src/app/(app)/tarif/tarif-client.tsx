'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, BadgeDollarSign, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { addRate, updateRate, deleteRate } from './actions'
import type { AcademicYear, SppRate } from '@/types'

export function TarifClient({ years, rates }: { years: AcademicYear[]; rates: SppRate[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SppRate | null>(null)
  const [yearId, setYearId] = useState(years.find((y) => y.is_active)?.id ?? years[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [deleting, setDeleting] = useState<SppRate | null>(null)
  const [delError, setDelError] = useState<string | null>(null)

  const yearName = useMemo(() => new Map(years.map((y) => [y.id, y.name])), [years])
  const currentByYear = useMemo(() => {
    const m = new Map<string, SppRate>()
    for (const r of rates) if (!m.has(r.academic_year_id)) m.set(r.academic_year_id, r)
    return m
  }, [rates])

  const activeYearId = years.find((y) => y.is_active)?.id ?? years[0]?.id ?? ''
  const activeRate = currentByYear.get(activeYearId) ?? null

  function openCreate() {
    // If the active year already has a rate, the primary action is to edit
    // its price directly rather than create a duplicate entry.
    if (activeRate) {
      openEdit(activeRate)
      return
    }
    setEditing(null)
    setYearId(activeYearId)
    setAmount('')
    setNote('')
    setError(null)
    setOpen(true)
  }

  function openEdit(r: SppRate) {
    setEditing(r)
    setYearId(r.academic_year_id)
    setAmount(String(Number(r.amount)))
    setNote(r.note ?? '')
    setError(null)
    setOpen(true)
  }

  function submit() {
    setError(null)
    start(async () => {
      const payload = { academic_year_id: yearId, amount: Number(amount), note }
      const res = editing ? await updateRate(editing.id, payload) : await addRate(payload)
      if (res.error) setError(res.error)
      else { setOpen(false); setEditing(null); setAmount(''); setNote(''); router.refresh() }
    })
  }

  function confirmDelete() {
    if (!deleting) return
    setDelError(null)
    start(async () => {
      const res = await deleteRate(deleting.id)
      if (res.error) setDelError(res.error)
      else { setDeleting(null); router.refresh() }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tarif SPP"
        description="Nominal SPP bulanan per tahun ajaran"
        actions={
          <button onClick={openCreate} className="btn btn-primary btn-sm">
            {activeRate ? <><Pencil size={16} /> Edit Harga SPP</> : <><Plus size={16} /> Tambah Tarif</>}
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {years.map((y) => {
          const cur = currentByYear.get(y.id)
          return (
            <div key={y.id} className="clay p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{y.name}</p>
                {y.is_active && <span className="badge status-success">Aktif</span>}
              </div>
              <p className="text-2xl font-extrabold mt-2" style={{ color: 'var(--accent)' }}>
                {cur ? formatCurrency(Number(cur.amount)) : '—'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>per bulan</p>
            </div>
          )
        })}
      </div>

      <div className="clay overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Riwayat Perubahan Tarif</h2>
        </div>
        {rates.length === 0 ? (
          <EmptyState icon={BadgeDollarSign} title="Belum ada tarif" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table data-cards">
              <thead><tr><th>Tahun Ajaran</th><th>Nominal</th><th>Catatan</th><th>Dibuat</th><th className="text-right">Aksi</th></tr></thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold" data-label="Tahun Ajaran">{yearName.get(r.academic_year_id) ?? '—'}</td>
                    <td data-label="Nominal">{formatCurrency(Number(r.amount))}</td>
                    <td data-label="Catatan">{r.note ?? '—'}</td>
                    <td className="text-xs" style={{ color: 'var(--text-muted)' }} data-label="Dibuat">{formatDateTime(r.created_at)}</td>
                    <td className="text-right cell-actions" data-label="Aksi">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openEdit(r)} className="btn btn-ghost btn-sm"><Pencil size={14} /> Edit</button>
                        <button onClick={() => { setDelError(null); setDeleting(r) }} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}><Trash2 size={14} /> Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Tarif SPP' : 'Tambah Tarif SPP'}>
        {error && (
          <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Tahun Ajaran</label>
            <select className="select" value={yearId} onChange={(e) => setYearId(e.target.value)}>
              {years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.is_active ? ' (Aktif)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nominal SPP (Rp)</label>
            <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="cth. 150000" min={1000} />
          </div>
          <div>
            <label className="label">Catatan (opsional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="cth. Penyesuaian tarif" />
          </div>
        </div>
        <div className="form-actions">
          <button onClick={() => setOpen(false)} className="btn btn-secondary">Batal</button>
          <button onClick={submit} className="btn btn-primary" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus Tarif">
        {delError && (
          <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{delError}</span>
          </div>
        )}
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Hapus tarif <span className="font-semibold">{deleting ? formatCurrency(Number(deleting.amount)) : ''}</span>
          {deleting ? ` (${yearName.get(deleting.academic_year_id) ?? ''})` : ''}? Tagihan yang sudah dibuat tidak terpengaruh.
        </p>
        <div className="form-actions">
          <button onClick={() => setDeleting(null)} className="btn btn-secondary">Batal</button>
          <button onClick={confirmDelete} className="btn btn-primary" disabled={pending}>{pending ? 'Menghapus…' : 'Hapus'}</button>
        </div>
      </Modal>
    </div>
  )
}
