'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Layers, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { saveClass, deleteClass } from './actions'
import type { Major, SchoolClass } from '@/types'

export function KelasClient({ classes, majors }: { classes: SchoolClass[]; majors: Major[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SchoolClass | null>(null)
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [majorId, setMajorId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function openModal(c: SchoolClass | null) {
    setEditing(c)
    setName(c?.name ?? '')
    setGrade(c?.grade ?? '')
    setMajorId(c?.major_id ?? '')
    setError(null)
    setOpen(true)
  }

  function submit() {
    setError(null)
    start(async () => {
      const res = await saveClass(editing?.id ?? null, { name, grade, major_id: majorId || null })
      if (res.error) setError(res.error)
      else { setOpen(false); router.refresh() }
    })
  }

  function remove(c: SchoolClass) {
    if (!confirm(`Hapus kelas ${c.name}?`)) return
    start(async () => {
      const res = await deleteClass(c.id)
      if (res.error) alert(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Kelas"
        description={`${classes.length} kelas`}
        actions={<button onClick={() => openModal(null)} className="btn btn-primary btn-sm"><Plus size={16} /> Tambah Kelas</button>}
      />
      <div className="clay overflow-hidden">
        {classes.length === 0 ? (
          <EmptyState icon={Layers} title="Belum ada kelas" />
        ) : (
          <table className="data-table">
            <thead><tr><th>Nama Kelas</th><th>Tingkat</th><th>Jurusan</th><th className="text-right">Aksi</th></tr></thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td>{c.grade}</td>
                  <td>{c.majors?.code ?? '—'}</td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => openModal(c)} className="btn btn-ghost btn-sm"><Pencil size={15} /> Edit</button>
                    <button onClick={() => remove(c)} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} disabled={pending}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Kelas' : 'Tambah Kelas'}>
        {error && (
          <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Nama Kelas</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. X RPL 1" />
          </div>
          <div>
            <label className="label">Tingkat</label>
            <input className="input" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="cth. X, XI, XII, 10, 7, 1" />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Bebas — sesuaikan dengan tingkatan sekolah (SD: 1-6, SMP: 7-9, SMA/SMK: X-XII).</p>
          </div>
          <div>
            <label className="label">Jurusan</label>
            <select className="select" value={majorId} onChange={(e) => setMajorId(e.target.value)}>
              <option value="">— Pilih Jurusan —</option>
              {majors.map((m) => <option key={m.id} value={m.id}>{m.code} · {m.name}</option>)}
            </select>
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
