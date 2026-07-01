'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, AlertTriangle, FileText } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { formatCurrency, statusBadgeClass, billLabel, BILL_STATUS_LABEL } from '@/lib/utils'
import { updateBill, deleteBills } from './actions'

export interface BillRow {
  id: string
  period_month: number
  period_year: number
  amount: number
  paid_amount: number
  bill_type: string | null
  title: string | null
  status: string
  is_locked: boolean
  students: { nis: string; full_name: string; classes: { name: string } | null } | null
}

export function TagihanTable({ rows, canManage, emptyDescription }: { rows: BillRow[]; canManage: boolean; emptyDescription: string }) {
  const router = useRouter()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState<BillRow | null>(null)
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  // Decoupled from `checked` so deleting a single row (via its own Hapus
  // button) never clobbers an unrelated multi-row selection made via the
  // bulk action bar.
  const [deleteIds, setDeleteIds] = useState<string[]>([])

  const deletable = rows.filter((r) => Number(r.paid_amount) === 0 && !r.is_locked)
  const selectableIds = new Set(deletable.map((r) => r.id))

  // Pagination — long bill lists (e.g. hundreds of SPP rows) stay scannable.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)

  function toggle(id: string) {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecked(next)
  }

  function toggleAll() {
    if (checked.size === selectableIds.size && selectableIds.size > 0) setChecked(new Set())
    else setChecked(new Set(selectableIds))
  }

  function openEdit(r: BillRow) {
    setEditing(r)
    setAmount(String(Number(r.amount)))
    setTitle(r.title ?? '')
    setError(null)
  }

  function submitEdit() {
    if (!editing) return
    setError(null)
    start(async () => {
      const res = await updateBill(editing.id, { amount: Number(amount), title })
      if (res.error) setError(res.error)
      else { setEditing(null); router.refresh() }
    })
  }

  function submitBulkDelete() {
    setBulkError(null)
    start(async () => {
      const res = await deleteBills(deleteIds)
      if (res.error) setBulkError(res.error)
      else {
        setBulkConfirm(false)
        setChecked((prev) => {
          const next = new Set(prev)
          deleteIds.forEach((id) => next.delete(id))
          return next
        })
        router.refresh()
      }
    })
  }

  if (rows.length === 0) {
    return (
      <div className="clay overflow-hidden">
        <EmptyState icon={FileText} title="Tidak ada tagihan" description={emptyDescription} />
      </div>
    )
  }

  return (
    <>
      {canManage && checked.size > 0 && (
        <div className="clay-pressed px-4 py-2.5 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{checked.size} tagihan dipilih</span>
          <button onClick={() => { setBulkError(null); setDeleteIds(Array.from(checked)); setBulkConfirm(true) }} className="btn btn-secondary btn-sm" style={{ color: 'var(--accent)' }}>
            <Trash2 size={14} /> Hapus Terpilih
          </button>
        </div>
      )}

      <div className="clay overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table data-cards">
            <thead>
              <tr>
                {canManage && (
                  <th className="w-8">
                    <input type="checkbox" className="w-4 h-4 accent-[var(--accent)]" checked={selectableIds.size > 0 && checked.size === selectableIds.size} onChange={toggleAll} />
                  </th>
                )}
                <th>NIS</th><th>Nama Siswa</th><th>Kelas</th><th>Keterangan</th><th>Nominal</th><th>Status</th>
                {canManage && <th className="text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const remaining = Math.max(Number(r.amount) - Number(r.paid_amount), 0)
                const canEditRow = Number(r.paid_amount) === 0 && !r.is_locked
                return (
                  <tr key={r.id}>
                    {canManage && (
                      <td data-label="">
                        {canEditRow && (
                          <input type="checkbox" className="w-4 h-4 accent-[var(--accent)]" checked={checked.has(r.id)} onChange={() => toggle(r.id)} />
                        )}
                      </td>
                    )}
                    <td className="font-mono text-xs" data-label="NIS">{r.students?.nis}</td>
                    <td className="font-semibold" data-label="Nama">{r.students?.full_name}</td>
                    <td data-label="Kelas">{r.students?.classes?.name ?? '—'}</td>
                    <td data-label="Keterangan">{billLabel(r)}</td>
                    <td data-label="Nominal">
                      {formatCurrency(Number(r.amount))}
                      {r.status === 'PARTIAL' && (
                        <span className="block text-xs" style={{ color: 'var(--accent-2)' }}>sisa {formatCurrency(remaining)}</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${statusBadgeClass(r.status)}`}>{BILL_STATUS_LABEL[r.status] ?? r.status}</span>
                      {r.is_locked && <span className="badge status-neutral ml-1">Terkunci</span>}
                    </td>
                    {canManage && (
                      <td className="text-right cell-actions" data-label="Aksi">
                        {canEditRow ? (
                          <div className="inline-flex gap-1">
                            <button onClick={() => openEdit(r)} className="btn btn-ghost btn-sm"><Pencil size={14} /> Edit</button>
                            <button onClick={() => { setBulkError(null); setDeleteIds([r.id]); setBulkConfirm(true) }} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}><Trash2 size={14} /> Hapus</button>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={safePage}
          pageSize={pageSize}
          total={rows.length}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1) }}
        />
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Tagihan">
        {error && (
          <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{editing?.students?.full_name} · {editing?.students?.nis}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{editing ? billLabel(editing) : ''}</p>
          </div>
          {editing?.bill_type !== 'SPP' && (
            <div>
              <label className="label">Judul Tagihan</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth. Seragam Batik" />
            </div>
          )}
          <div>
            <label className="label">Nominal (Rp)</label>
            <input className="input" type="number" min={1000} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div className="form-actions">
          <button onClick={() => setEditing(null)} className="btn btn-secondary">Batal</button>
          <button onClick={submitEdit} className="btn btn-primary" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </Modal>

      <Modal open={bulkConfirm} onClose={() => setBulkConfirm(false)} title="Hapus Tagihan">
        {bulkError && (
          <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{bulkError}</span>
          </div>
        )}
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Hapus {deleteIds.length} tagihan terpilih? Tindakan ini tidak dapat dibatalkan. Hanya tagihan yang belum ada pembayaran yang akan dihapus.
        </p>
        <div className="form-actions">
          <button onClick={() => setBulkConfirm(false)} className="btn btn-secondary">Batal</button>
          <button onClick={submitBulkDelete} className="btn btn-primary" disabled={pending}>{pending ? 'Menghapus…' : 'Hapus'}</button>
        </div>
      </Modal>
    </>
  )
}
