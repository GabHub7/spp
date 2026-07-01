'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, GraduationCap, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { saveMajor } from './actions'
import type { Major } from '@/types'

export function JurusanClient({ majors }: { majors: Major[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Major | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function openModal(m: Major | null) {
    setEditing(m)
    setCode(m?.code ?? '')
    setName(m?.name ?? '')
    setError(null)
    setOpen(true)
  }

  function submit() {
    setError(null)
    start(async () => {
      const res = await saveMajor(editing?.id ?? null, { code, name })
      if (res.error) setError(res.error)
      else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Jurusan"
        description={`${majors.length} jurusan`}
        actions={<button onClick={() => openModal(null)} className="btn btn-primary btn-sm"><Plus size={16} /> Tambah Jurusan</button>}
      />
      <div className="clay overflow-hidden">
        {majors.length === 0 ? (
          <EmptyState icon={GraduationCap} title="Belum ada jurusan" />
        ) : (
          <table className="data-table">
            <thead><tr><th>Kode</th><th>Nama Jurusan</th><th className="text-right">Aksi</th></tr></thead>
            <tbody>
              {majors.map((m) => (
                <tr key={m.id}>
                  <td className="font-bold">{m.code}</td>
                  <td>{m.name}</td>
                  <td className="text-right">
                    <button onClick={() => openModal(m)} className="btn btn-ghost btn-sm"><Pencil size={15} /> Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Jurusan' : 'Tambah Jurusan'}>
        {error && (
          <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Kode Jurusan</label>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="cth. RPL" />
          </div>
          <div>
            <label className="label">Nama Jurusan</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Rekayasa Perangkat Lunak" />
          </div>
        </div>
        <div className="form-actions">
          <button onClick={() => setOpen(false)} className="btn btn-secondary">Batal</button>
          <button onClick={submit} className="btn btn-primary" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </Modal>
    </div>
  )
}
