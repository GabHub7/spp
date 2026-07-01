'use client'

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, UserPlus, Wallet, CreditCard, AlertTriangle, CheckCircle2, Clock,
  Upload, GraduationCap, Receipt,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/utils'
import { addChild } from './actions'
import type { ChildBills, ChildBill } from '@/lib/queries'
import type { PaymentSettings } from '@/types'

export function PortalClient({
  fullName, kids, settings, yearName,
}: {
  fullName: string
  kids: ChildBills[]
  settings: PaymentSettings | null
  yearName: string | null
}) {
  const router = useRouter()
  const totalTunggakan = kids.reduce((s, c) => s + c.unpaidTotal, 0)

  // Add-child modal
  const [addOpen, setAddOpen] = useState(false)
  const [nis, setNis] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, startAdd] = useTransition()

  function submitAddChild() {
    setAddError(null)
    startAdd(async () => {
      const res = await addChild(nis)
      if (res.error) setAddError(res.error)
      else { setAddOpen(false); setNis(''); router.refresh() }
    })
  }

  // Pay flow
  const [payChild, setPayChild] = useState<ChildBills | null>(null)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="section-title">Halo, {fullName.split(' ')[0]}</h1>
        <p className="section-subtitle mt-1">
          Pembayaran SPP {yearName ? `Tahun Ajaran ${yearName}` : ''}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="clay p-4">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Tunggakan</p>
          <p className="text-xl font-extrabold mt-1" style={{ color: 'var(--accent)' }}>{formatCurrency(totalTunggakan)}</p>
        </div>
        <div className="clay p-4">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Jumlah Anak</p>
          <p className="text-xl font-extrabold mt-1" style={{ color: 'var(--text-primary)' }}>{kids.length}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => { setAddError(null); setAddOpen(true) }} className="btn btn-secondary btn-sm">
          <UserPlus size={16} /> Tambah Anak
        </button>
      </div>

      {kids.length === 0 ? (
        <div className="clay">
          <EmptyState
            icon={GraduationCap}
            title="Belum ada anak terhubung"
            description="Tambahkan anak Anda menggunakan NIS untuk melihat dan membayar tagihan SPP."
            action={<button onClick={() => setAddOpen(true)} className="btn btn-primary btn-sm"><Plus size={16} /> Tambah Anak</button>}
          />
        </div>
      ) : (
        kids.map((c) => (
          <div key={c.student.id} className="clay p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid place-items-center w-11 h-11 rounded-[14px] text-white shrink-0" style={{ background: 'var(--grad-brand)' }}>
                  <GraduationCap size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{c.student.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {c.student.nis} · {c.student.class_name || '—'}
                  </p>
                </div>
              </div>
              {c.unpaidCount > 0 && c.unpaidCount > c.pendingCount && (
                <button onClick={() => setPayChild(c)} className="btn btn-primary btn-sm shrink-0">
                  <Wallet size={15} /> Bayar
                </button>
              )}
            </div>

            {c.bills.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada tagihan untuk tahun ajaran aktif.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {c.bills.map((b) => (
                  <BillChip key={b.id} bill={b} />
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {/* Add child modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Anak">
        {addError && (
          <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{addError}</span>
          </div>
        )}
        <label className="label">NIS Anak</label>
        <input className="input" value={nis} onChange={(e) => setNis(e.target.value)} placeholder="Masukkan NIS" />
        <div className="form-actions">
          <button onClick={() => setAddOpen(false)} className="btn btn-secondary">Batal</button>
          <button onClick={submitAddChild} className="btn btn-primary" disabled={adding}>{adding ? 'Menambah…' : 'Tambah'}</button>
        </div>
      </Modal>

      {/* Pay modal */}
      {payChild && (
        <PayModal child={payChild} settings={settings} onClose={() => setPayChild(null)} onDone={() => { setPayChild(null); router.refresh() }} />
      )}
    </div>
  )
}

function BillChip({ bill }: { bill: ChildBill }) {
  const paid = bill.status === 'PAID'
  const partial = bill.status === 'PARTIAL'
  const pending = bill.pending
  const tone = paid ? 'status-success' : pending ? 'status-info' : partial ? 'status-info' : 'status-warning'
  const Icon = paid ? CheckCircle2 : pending ? Clock : AlertTriangle
  const label = paid ? 'Lunas' : pending ? 'Verifikasi' : partial ? 'Cicilan' : 'Belum'
  return (
    <div className="rounded-[14px] p-2.5" style={{ background: 'var(--bg-tertiary)' }}>
      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{bill.label}</p>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(paid ? bill.amount : bill.remaining)}</p>
      <span className={`badge ${tone} mt-1`}><Icon size={11} /> {label}</span>
    </div>
  )
}

function PayModal({
  child, settings, onClose, onDone,
}: {
  child: ChildBills
  settings: PaymentSettings | null
  onClose: () => void
  onDone: () => void
}) {
  const payable = child.bills.filter((b) => b.status !== 'PAID' && !b.pending)
  const [checked, setChecked] = useState<Set<string>>(new Set(payable.map((b) => b.id)))
  const [method, setMethod] = useState<'TRANSFER' | 'QRIS'>('TRANSFER')
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const total = payable.filter((b) => checked.has(b.id)).reduce((s, b) => s + b.remaining, 0)

  function toggle(id: string) {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecked(next)
  }

  async function submit() {
    setError(null)
    if (checked.size === 0) { setError('Pilih minimal satu tagihan.'); return }
    if (!file) { setError('Unggah bukti pembayaran terlebih dahulu.'); return }
    setLoading(true)
    const fd = new FormData()
    fd.append('studentId', child.student.id)
    fd.append('billIds', Array.from(checked).join(','))
    fd.append('method', method)
    fd.append('note', note)
    fd.append('proof', file)
    try {
      const res = await fetch('/api/parent/pay', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Gagal mengirim pembayaran.')
      else onDone()
    } catch {
      setError('Tidak dapat terhubung ke server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Bayar Tagihan · ${child.student.full_name}`} size="lg">
      {error && (
        <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      <p className="label">Pilih Tagihan</p>
      <div className="flex flex-col gap-2 max-h-52 overflow-y-auto no-scrollbar mb-4">
        {payable.map((b) => (
          <label key={b.id} className="flex items-center gap-3 p-3 rounded-[14px] cursor-pointer" style={{ background: checked.has(b.id) ? 'var(--accent-light)' : 'var(--bg-tertiary)' }}>
            <input type="checkbox" checked={checked.has(b.id)} onChange={() => toggle(b.id)} className="w-4 h-4 accent-[var(--accent)]" />
            <span className="flex-1 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {b.label}
              {b.status === 'PARTIAL' && <span className="block text-xs font-normal" style={{ color: 'var(--accent-2)' }}>sisa cicilan</span>}
            </span>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{formatCurrency(b.remaining)}</span>
          </label>
        ))}
      </div>

      <p className="label">Metode Pembayaran</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {([{ v: 'TRANSFER', icon: Wallet, label: 'Transfer Bank' }, { v: 'QRIS', icon: CreditCard, label: 'QRIS' }] as const).map(({ v, icon: Icon, label }) => (
          <button key={v} onClick={() => setMethod(v)} className="press-effect flex items-center justify-center gap-2 py-3 rounded-[14px] text-sm font-semibold"
            style={method === v ? { background: 'var(--accent)', color: '#fff', boxShadow: 'var(--clay-primary)' } : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {method === 'TRANSFER' ? (
        <div className="clay-pressed p-4 mb-4 text-sm">
          {settings?.bank_name ? (
            <>
              <p style={{ color: 'var(--text-secondary)' }}>Silakan transfer ke:</p>
              <p className="font-bold text-base mt-1" style={{ color: 'var(--text-primary)' }}>{settings.bank_name}</p>
              <p className="font-mono text-base" style={{ color: 'var(--accent)' }}>{settings.bank_account_no}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>a.n. {settings.bank_account_holder}</p>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Informasi rekening belum diatur. Hubungi sekolah.</p>
          )}
        </div>
      ) : (
        <div className="clay-pressed p-4 mb-4 text-center">
          {settings?.qris_image_url ? (
            <>
              <img src={settings.qris_image_url} alt="Kode QRIS pembayaran" className="mx-auto rounded-[12px] max-h-64 w-auto" />
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>Pindai QRIS di atas, lalu unggah bukti pembayaran.</p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gambar QRIS belum diunggah oleh sekolah.</p>
          )}
        </div>
      )}

      <label className="label">Unggah Bukti Pembayaran</label>
      <label className="flex items-center gap-2 px-3.5 py-3 rounded-[14px] cursor-pointer mb-1" style={{ background: 'var(--bg-input)', boxShadow: 'var(--clay-inset)' }}>
        <Upload size={16} style={{ color: 'var(--text-secondary)' }} />
        <span className="text-sm truncate" style={{ color: file ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {file ? file.name : 'Pilih gambar/PDF bukti (maks 5 MB)'}
        </span>
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>

      <label className="label mt-3">Catatan (opsional)</label>
      <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="cth. transfer dari rekening BCA" />

      <div className="flex items-center justify-between py-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total</span>
        <span className="text-xl font-extrabold" style={{ color: 'var(--accent)' }}>{formatCurrency(total)}</span>
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onClose} className="btn btn-secondary">Batal</button>
        <button onClick={submit} className="btn btn-primary" disabled={loading}>
          <Receipt size={16} /> {loading ? 'Mengirim…' : 'Kirim Pembayaran'}
        </button>
      </div>
    </Modal>
  )
}
