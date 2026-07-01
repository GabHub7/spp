'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { BILL_TYPE_LABEL } from '@/lib/utils'
import { createCustomBills } from './actions'
import type { SchoolClass } from '@/types'

const TYPES = ['SERAGAM', 'PTS', 'PAS', 'DAFTAR_ULANG', 'LAINNYA'] as const

export function CustomBillButton({ classes }: { classes: SchoolClass[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [billType, setBillType] = useState<(typeof TYPES)[number]>('SERAGAM')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [target, setTarget] = useState('ALL_ACTIVE')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function submit() {
    setError(null)
    start(async () => {
      const res = await createCustomBills({ bill_type: billType, title: title.trim(), amount: Number(amount), target })
      if (res.error) setError(res.error)
      else {
        setOpen(false)
        setTitle('')
        setAmount('')
        setTarget('ALL_ACTIVE')
        setDone(`${res.created ?? 0} tagihan ${BILL_TYPE_LABEL[billType]} dibuat.`)
        router.refresh()
      }
    })
  }

  return (
    <>
      {done && <span className="badge status-success"><CheckCircle2 size={13} /> {done}</span>}
      <button onClick={() => { setError(null); setDone(null); setOpen(true) }} className="btn btn-accent2 btn-sm">
        <FilePlus2 size={16} /> Tagihan Lain
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Buat Tagihan Lain">
        {error && (
          <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Jenis Pembayaran</label>
            <select className="select" value={billType} onChange={(e) => setBillType(e.target.value as (typeof TYPES)[number])}>
              {TYPES.map((t) => <option key={t} value={t}>{BILL_TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Judul / Keterangan</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth. Seragam Olahraga 2026" />
          </div>
          <div>
            <label className="label">Nominal (Rp)</label>
            <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="cth. 250000" min={1000} />
          </div>
          <div>
            <label className="label">Sasaran</label>
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="ALL_ACTIVE">Semua Siswa Aktif</option>
              {classes.map((c) => <option key={c.id} value={c.id}>Kelas {c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button onClick={() => setOpen(false)} className="btn btn-secondary">Batal</button>
          <button onClick={submit} className="btn btn-primary" disabled={pending}>{pending ? 'Membuat…' : 'Buat Tagihan'}</button>
        </div>
      </Modal>
    </>
  )
}
