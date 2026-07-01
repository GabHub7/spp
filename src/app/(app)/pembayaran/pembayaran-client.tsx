'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, User, CreditCard, Wallet, Banknote, AlertTriangle, Printer, History, CheckCircle2, Lock,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDateTime, billLabel, PAYMENT_METHOD_LABEL, isDisplayedAsInstallment } from '@/lib/utils'
import {
  searchStudents, getStudentBills, payBills, payInstallment,
  type StudentMatch, type UnpaidBill,
} from './actions'
import type { PaymentMethod, PaymentSettings } from '@/types'

interface RecentPayment {
  id: string
  transaction_no: string
  amount: number
  method: string
  is_installment: boolean
  paid_at: string
  officer_name: string | null
  students: { nis: string; full_name: string } | null
  bills: { period_month: number; period_year: number; bill_type: string | null; title: string | null; status: string } | null
}

type Mode = 'LUNAS' | 'CICIL'

export function PembayaranClient({ recent, settings }: { recent: RecentPayment[]; settings: PaymentSettings | null }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<StudentMatch[]>([])
  const [selected, setSelected] = useState<StudentMatch | null>(null)
  const [bills, setBills] = useState<UnpaidBill[]>([])
  const [mode, setMode] = useState<Mode>('LUNAS')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [cicilBillId, setCicilBillId] = useState<string | null>(null)
  const [cicilAmount, setCicilAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('TUNAI')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [searching, startSearch] = useTransition()
  const [paying, startPay] = useTransition()

  function doSearch() {
    setError(null)
    startSearch(async () => {
      const res = await searchStudents(query)
      setMatches(res)
      if (res.length === 0) setError('Siswa tidak ditemukan.')
    })
  }

  function pickStudent(s: StudentMatch) {
    setSelected(s)
    setMatches([])
    setChecked(new Set())
    setCicilBillId(null)
    setCicilAmount('')
    setError(null)
    startSearch(async () => {
      const b = await getStudentBills(s.id)
      setBills(b)
    })
  }

  function switchMode(m: Mode) {
    setMode(m)
    setChecked(new Set())
    setCicilBillId(null)
    setCicilAmount('')
    setError(null)
  }

  function toggle(id: string) {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecked(next)
  }

  const payable = bills.filter((b) => !b.is_locked)

  function toggleAll() {
    if (checked.size === payable.length) setChecked(new Set())
    else setChecked(new Set(payable.map((b) => b.id)))
  }

  function pickCicil(b: UnpaidBill) {
    if (b.is_locked) return
    setCicilBillId(b.id)
    setCicilAmount(String(b.remaining))
    setError(null)
  }

  const cicilBill = bills.find((b) => b.id === cicilBillId) ?? null
  const total =
    mode === 'LUNAS'
      ? bills.filter((b) => checked.has(b.id)).reduce((s, b) => s + b.remaining, 0)
      : Number(cicilAmount) || 0

  const canPay =
    !!selected &&
    (mode === 'LUNAS'
      ? checked.size > 0
      : !!cicilBillId && Number(cicilAmount) > 0 && Number(cicilAmount) <= (cicilBill?.remaining ?? 0))

  function pay() {
    if (!selected) return
    if (mode === 'CICIL' && !cicilBillId) { setError('Pilih satu tagihan untuk dicicil.'); return }
    setError(null)
    startPay(async () => {
      const res =
        mode === 'LUNAS'
          ? await payBills(selected.id, Array.from(checked), method, note)
          : await payInstallment(selected.id, cicilBillId!, Number(cicilAmount), method, note)
      if (res.error) setError(res.error)
      else if (res.firstPaymentId) router.push(`/pembayaran/${res.firstPaymentId}/struk`)
    })
  }

  function reset() {
    setSelected(null)
    setBills([])
    setChecked(new Set())
    setCicilBillId(null)
    setCicilAmount('')
    setQuery('')
    setMatches([])
    setError(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Pembayaran" description="Catat pembayaran SPP / tagihan lain — lunas atau cicilan, tunai/transfer/QRIS — lalu cetak bukti." />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: search + bills */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {!selected ? (
            <div className="clay p-5">
              <label className="label">Cari Siswa</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                    placeholder="Masukkan NIS atau nama siswa…"
                    className="input pl-10"
                  />
                </div>
                <button onClick={doSearch} className="btn btn-primary" disabled={searching}>
                  {searching ? 'Mencari…' : 'Cari'}
                </button>
              </div>

              {matches.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => pickStudent(m)}
                      className="press-effect flex items-center gap-3 p-3 rounded-[14px] text-left hover-lift"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <div className="grid place-items-center w-9 h-9 rounded-full text-white shrink-0" style={{ background: 'var(--grad-brand)' }}>
                        <User size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{m.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.nis} · {m.class_name ?? '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="clay p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid place-items-center w-11 h-11 rounded-full text-white shrink-0" style={{ background: 'var(--grad-brand)' }}>
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{selected.full_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selected.nis} · {selected.class_name ?? '—'}</p>
                  </div>
                </div>
                <button onClick={reset} className="btn btn-ghost btn-sm">Ganti</button>
              </div>

              {bills.length === 0 ? (
                <div className="rounded-[14px] p-5 text-center" style={{ background: 'var(--bg-tertiary)' }}>
                  <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: '#15803d' }} />
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Tidak ada tunggakan</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Seluruh tagihan siswa ini sudah lunas.</p>
                </div>
              ) : (
                <>
                  {/* Mode toggle */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {(['LUNAS', 'CICIL'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => switchMode(m)}
                        className="press-effect py-2.5 rounded-[14px] text-sm font-semibold"
                        style={mode === m
                          ? { background: 'var(--accent)', color: '#fff', boxShadow: 'var(--clay-primary)' }
                          : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        {m === 'LUNAS' ? 'Bayar Lunas' : 'Cicilan'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <p className="label mb-0">{mode === 'LUNAS' ? 'Pilih Tagihan' : 'Pilih 1 Tagihan untuk Dicicil'}</p>
                    {mode === 'LUNAS' && (
                      <button onClick={toggleAll} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                        {checked.size === payable.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto no-scrollbar">
                    {bills.map((b) => {
                      const active = mode === 'LUNAS' ? checked.has(b.id) : cicilBillId === b.id
                      return (
                        <label
                          key={b.id}
                          onClick={() => mode === 'CICIL' && pickCicil(b)}
                          className={`flex items-center gap-3 p-3 rounded-[14px] ${b.is_locked ? 'opacity-60' : 'cursor-pointer'}`}
                          style={{ background: active ? 'var(--accent-light)' : 'var(--bg-tertiary)' }}
                        >
                          <input
                            type={mode === 'LUNAS' ? 'checkbox' : 'radio'}
                            name="billpick"
                            disabled={b.is_locked}
                            checked={active}
                            onChange={() => (mode === 'LUNAS' ? toggle(b.id) : pickCicil(b))}
                            className="w-4 h-4 accent-[var(--accent)]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{b.label}</p>
                            {b.status === 'PARTIAL' && (
                              <p className="text-xs" style={{ color: 'var(--accent-2)' }}>Cicilan berjalan · sisa {formatCurrency(b.remaining)}</p>
                            )}
                          </div>
                          {b.is_locked && <Lock size={14} style={{ color: 'var(--text-muted)' }} />}
                          <p className="font-bold text-sm shrink-0" style={{ color: 'var(--text-primary)' }}>{formatCurrency(b.remaining)}</p>
                        </label>
                      )
                    })}
                  </div>

                  {mode === 'CICIL' && cicilBill && (
                    <div className="mt-4">
                      <label className="label">Nominal Cicilan (maks {formatCurrency(cicilBill.remaining)})</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={cicilBill.remaining}
                        value={cicilAmount}
                        onChange={(e) => setCicilAmount(e.target.value)}
                        placeholder="cth. 50000"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: payment summary */}
        <div className="lg:col-span-2">
          <div className="clay p-5 lg:sticky lg:top-20">
            <h2 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Detail Pembayaran</h2>

            <label className="label">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {([
                { v: 'TUNAI', icon: Banknote },
                { v: 'TRANSFER', icon: Wallet },
                { v: 'QRIS', icon: CreditCard },
              ] as const).map(({ v, icon: Icon }) => (
                <button
                  key={v}
                  onClick={() => setMethod(v)}
                  className="press-effect flex flex-col items-center gap-1.5 py-3 rounded-[14px] text-xs font-semibold"
                  style={
                    method === v
                      ? { background: 'var(--accent)', color: '#fff', boxShadow: 'var(--clay-primary)' }
                      : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
                  }
                >
                  <Icon size={18} />
                  {PAYMENT_METHOD_LABEL[v]}
                </button>
              ))}
            </div>

            {method === 'TRANSFER' && settings?.bank_name && (
              <div className="clay-pressed p-3 mb-4 text-sm">
                <p style={{ color: 'var(--text-secondary)' }}>Transfer ke:</p>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{settings.bank_name}</p>
                <p className="font-mono" style={{ color: 'var(--text-primary)' }}>{settings.bank_account_no}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>a.n. {settings.bank_account_holder}</p>
              </div>
            )}
            {method === 'QRIS' && (
              <div className="clay-pressed p-3 mb-4 text-sm">
                <p style={{ color: 'var(--text-secondary)' }}>
                  {settings?.qris_provider ? `Provider QRIS: ${settings.qris_provider}` : 'Tunjukkan QRIS ke siswa untuk dipindai.'}
                </p>
              </div>
            )}

            <label className="label">Catatan (opsional)</label>
            <input className="input mb-4" value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === 'CICIL' ? 'cth. Cicilan ke-1' : 'cth. Pembayaran 2 bulan'} />

            <div className="flex items-center justify-between py-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{mode === 'CICIL' ? 'Cicilan' : 'Total'}</span>
              <span className="text-xl font-extrabold" style={{ color: 'var(--accent)' }}>{formatCurrency(total)}</span>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-3 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
              </div>
            )}

            <button onClick={pay} className="btn btn-primary w-full" disabled={paying || !canPay}>
              <Printer size={16} /> {paying ? 'Memproses…' : 'Bayar & Cetak Bukti'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent payments */}
      <div className="clay overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <History size={17} style={{ color: 'var(--text-secondary)' }} />
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Pembayaran Terbaru</h2>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={History} title="Belum ada pembayaran" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table data-cards">
              <thead>
                <tr><th>No. Transaksi</th><th>Siswa</th><th>Keterangan</th><th>Metode</th><th>Nominal</th><th>Waktu</th><th></th></tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs" data-label="No. Transaksi">{p.transaction_no}</td>
                    <td className="font-semibold" data-label="Siswa">{p.students?.full_name ?? '—'}</td>
                    <td data-label="Keterangan">
                      {p.bills ? billLabel(p.bills) : '—'}
                      {isDisplayedAsInstallment(p, p.bills) && <span className="badge status-info ml-1">Cicil</span>}
                    </td>
                    <td data-label="Metode"><span className="badge status-neutral">{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</span></td>
                    <td className="font-semibold" data-label="Nominal">{formatCurrency(Number(p.amount))}</td>
                    <td className="text-xs" style={{ color: 'var(--text-muted)' }} data-label="Waktu">{formatDateTime(p.paid_at)}</td>
                    <td className="text-right cell-actions">
                      <Link href={`/pembayaran/${p.id}/struk`} className="btn btn-ghost btn-sm"><Printer size={15} /> Bukti</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
