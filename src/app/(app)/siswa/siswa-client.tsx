'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, Download, Upload, Pencil, Users, AlertTriangle, CheckCircle2,
  FileSpreadsheet, X, Trash2, RotateCcw,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { PdfExportButton } from '@/components/ui/pdf-export-button'
import { Pagination } from '@/components/ui/pagination'
import { STUDENT_STATUS_LABEL, statusBadgeClass } from '@/lib/utils'
import { createStudent, updateStudent, bulkSetStudentStatus, deleteStudents, type StudentInput } from './actions'
import type { SchoolClass, Major, Student } from '@/types'

interface Props {
  canManage: boolean
  students: Student[]
  classes: SchoolClass[]
  majors: Major[]
}

const EMPTY: StudentInput = {
  nis: '', full_name: '', gender: 'L', class_id: null, major_id: null,
  parent_name: '', parent_phone: '', address: '', status: 'ACTIVE',
}

export function SiswaClient({ canManage, students, classes, majors }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [majorFilter, setMajorFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState<StudentInput>(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Bulk selection
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  const hasFilters = !!(query || classFilter || majorFilter || statusFilter)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter((s) => {
      if (classFilter && s.class_id !== classFilter) return false
      if (majorFilter && s.major_id !== majorFilter) return false
      if (statusFilter && s.status !== statusFilter) return false
      if (!q) return true
      return (
        s.nis.toLowerCase().includes(q) ||
        s.full_name.toLowerCase().includes(q) ||
        (s.parent_name ?? '').toLowerCase().includes(q)
      )
    })
  }, [students, query, classFilter, majorFilter, statusFilter])

  // Pagination — keeps large student lists from turning into an endless scroll.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function resetFilters() {
    setQuery('')
    setClassFilter('')
    setMajorFilter('')
    setStatusFilter('')
    setPage(1)
  }

  const droppedSelected = Array.from(checked).filter((id) => students.find((s) => s.id === id)?.status === 'DROPPED')

  function toggle(id: string) {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecked(next)
  }

  function toggleAll() {
    if (checked.size === filtered.length && filtered.length > 0) setChecked(new Set())
    else setChecked(new Set(filtered.map((s) => s.id)))
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(s: Student) {
    setEditing(s)
    setForm({
      nis: s.nis, full_name: s.full_name, gender: s.gender,
      class_id: s.class_id, major_id: s.major_id,
      parent_name: s.parent_name ?? '', parent_phone: s.parent_phone ?? '',
      address: s.address ?? '', status: s.status,
    })
    setFormError(null)
    setModalOpen(true)
  }

  function submit() {
    setFormError(null)
    const wasEditing = !!editing
    const name = form.full_name
    startTransition(async () => {
      const res = editing ? await updateStudent(editing.id, form) : await createStudent(form)
      if (res.error) {
        setFormError(res.error)
      } else {
        setModalOpen(false)
        setImportMsg(null)
        setSavedMsg(wasEditing ? `Perubahan data ${name} berhasil disimpan.` : `Siswa ${name} berhasil ditambahkan.`)
        router.refresh()
      }
    })
  }

  function bulkStatus(status: StudentInput['status']) {
    setBulkError(null)
    startTransition(async () => {
      const res = await bulkSetStudentStatus(Array.from(checked), status)
      if (res.error) setBulkError(res.error)
      else { setChecked(new Set()); router.refresh() }
    })
  }

  function confirmBulkDelete() {
    setBulkError(null)
    startTransition(async () => {
      const res = await deleteStudents(droppedSelected)
      if (res.error) setBulkError(res.error)
      else { setBulkDeleteConfirm(false); setChecked(new Set()); router.refresh() }
    })
  }

  function deleteOne(s: Student) {
    if (!confirm(`Hapus siswa ${s.full_name} (${s.nis}) secara permanen? Seluruh riwayat tagihan & pembayaran siswa ini akan ikut terhapus.`)) return
    startTransition(async () => {
      const res = await deleteStudents([s.id])
      if (res.error) alert(res.error)
      else router.refresh()
    })
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/siswa/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setImportMsg({ ok: false, text: data.error ?? 'Gagal mengimpor.' })
      } else {
        setImportMsg({
          ok: true,
          text: `${data.inserted} siswa diimpor, ${data.skipped} dilewati.${data.errors?.length ? ' ' + data.errors.slice(0, 3).join('; ') : ''}`,
        })
        router.refresh()
      }
    } catch {
      setImportMsg({ ok: false, text: 'Tidak dapat terhubung ke server.' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Data Siswa"
        description={`${students.length} siswa terdaftar`}
        actions={
          <>
            <a href="/api/siswa/export" className="btn btn-secondary btn-sm">
              <Download size={16} /> Export Excel
            </a>
            <PdfExportButton
              title="Data Siswa"
              subtitle={`${filtered.length} siswa${hasFilters ? ' (sesuai filter)' : ''}`}
              columns={['NIS', 'Nama', 'L/P', 'Kelas', 'Jurusan', 'Orang Tua', 'Status']}
              rows={filtered.map((s) => [s.nis, s.full_name, s.gender, s.classes?.name ?? '—', s.majors?.code ?? '—', s.parent_name ?? '—', STUDENT_STATUS_LABEL[s.status]])}
              filename="data-siswa.pdf"
            />
            {canManage && (
              <>
                <a href="/api/siswa/template" className="btn btn-secondary btn-sm">
                  <FileSpreadsheet size={16} /> Template
                </a>
                <button onClick={() => fileRef.current?.click()} className="btn btn-accent2 btn-sm">
                  <Upload size={16} /> Import
                </button>
                <button onClick={openCreate} className="btn btn-primary btn-sm">
                  <Plus size={16} /> Tambah Siswa
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={onImportFile}
                />
              </>
            )}
          </>
        }
      />

      {savedMsg && (
        <div
          className="flex items-center justify-between gap-2 rounded-[14px] px-3.5 py-3 text-sm animate-fade-in"
          style={{ background: 'rgba(22,163,74,0.1)', color: '#15803d' }}
          role="status"
        >
          <span className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{savedMsg}</span>
          <button onClick={() => setSavedMsg(null)} className="press-effect shrink-0" aria-label="Tutup"><X size={15} /></button>
        </div>
      )}

      {importMsg && (
        <div
          className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 text-sm"
          style={{
            background: importMsg.ok ? 'rgba(22,163,74,0.1)' : 'var(--accent-light)',
            color: importMsg.ok ? '#15803d' : 'var(--accent)',
          }}
        >
          {importMsg.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
          <span>{importMsg.text}</span>
        </div>
      )}

      {/* Filters */}
      <div className="clay p-4 flex flex-col gap-3">
        <div className="filter-bar">
          <div className="relative filter-search">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              placeholder="Cari NIS, nama, atau orang tua…"
              className="input pl-10"
            />
          </div>
          <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1) }} className="select filter-select">
            <option value="">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={majorFilter} onChange={(e) => { setMajorFilter(e.target.value); setPage(1) }} className="select filter-select">
            <option value="">Semua Jurusan</option>
            {majors.map((m) => (
              <option key={m.id} value={m.id}>{m.code}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="select filter-select">
            <option value="">Semua Status</option>
            {Object.entries(STUDENT_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Menampilkan <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{filtered.length}</span> dari {students.length} siswa
          </p>
          {hasFilters && (
            <button onClick={resetFilters} className="btn btn-ghost btn-sm"><RotateCcw size={13} /> Reset Filter</button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {canManage && checked.size > 0 && (
        <div className="clay-pressed px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{checked.size} siswa dipilih</span>
          <div className="flex items-center gap-2 flex-wrap">
            {bulkError && <span className="text-xs" style={{ color: 'var(--accent)' }}>{bulkError}</span>}
            <select
              className="select"
              style={{ minHeight: '2.25rem', padding: '0.375rem 0.875rem', fontSize: '0.8125rem', width: 'auto' }}
              defaultValue=""
              onChange={(e) => { if (e.target.value) { bulkStatus(e.target.value as StudentInput['status']); e.target.value = '' } }}
              disabled={pending}
            >
              <option value="" disabled>Ubah status massal…</option>
              {Object.entries(STUDENT_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {droppedSelected.length > 0 && (
              <button onClick={() => { setBulkError(null); setBulkDeleteConfirm(true) }} className="btn btn-secondary btn-sm" style={{ color: 'var(--accent)' }} disabled={pending}>
                <Trash2 size={14} /> Hapus {droppedSelected.length} Siswa Keluar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="clay overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Belum ada siswa"
            description={hasFilters ? 'Tidak ada siswa yang cocok dengan filter.' : 'Tambahkan siswa atau impor dari Excel.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table data-cards">
              <thead>
                <tr>
                  {canManage && (
                    <th className="w-8">
                      <input type="checkbox" className="w-4 h-4 accent-[var(--accent)]" checked={checked.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                    </th>
                  )}
                  <th>NIS</th>
                  <th>Nama</th>
                  <th>L/P</th>
                  <th>Kelas</th>
                  <th>Jurusan</th>
                  <th>Orang Tua</th>
                  <th>Status</th>
                  {canManage && <th className="text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => (
                  <tr key={s.id}>
                    {canManage && (
                      <td data-label="">
                        <input type="checkbox" className="w-4 h-4 accent-[var(--accent)]" checked={checked.has(s.id)} onChange={() => toggle(s.id)} />
                      </td>
                    )}
                    <td className="font-mono text-xs" data-label="NIS">{s.nis}</td>
                    <td className="font-semibold" data-label="Nama">{s.full_name}</td>
                    <td data-label="L/P">{s.gender}</td>
                    <td data-label="Kelas">{s.classes?.name ?? '—'}</td>
                    <td data-label="Jurusan">{s.majors?.code ?? '—'}</td>
                    <td data-label="Orang Tua">
                      <div className="leading-tight">
                        <p>{s.parent_name ?? '—'}</p>
                        {s.parent_phone && (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.parent_phone}</p>
                        )}
                      </div>
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${statusBadgeClass(s.status)}`}>{STUDENT_STATUS_LABEL[s.status]}</span>
                    </td>
                    {canManage && (
                      <td className="text-right cell-actions" data-label="Aksi">
                        <div className="inline-flex gap-1">
                          <button onClick={() => openEdit(s)} className="btn btn-ghost btn-sm" aria-label="Edit">
                            <Pencil size={15} /> Edit
                          </button>
                          {s.status === 'DROPPED' && (
                            <button onClick={() => deleteOne(s)} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} aria-label="Hapus">
                              <Trash2 size={15} /> Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={safePage}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1) }}
        />
      </div>

      {/* Add / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Siswa' : 'Tambah Siswa'} size="lg">
        {formError && (
          <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">NIS</label>
            <input className="input" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} placeholder="Nomor Induk Siswa" />
          </div>
          <div>
            <label className="label">Nama Lengkap</label>
            <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nama siswa" />
          </div>
          <div>
            <label className="label">Jenis Kelamin</label>
            <select className="select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as 'L' | 'P' })}>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StudentInput['status'] })}>
              {Object.entries(STUDENT_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Kelas</label>
            <select
              className="select"
              value={form.class_id ?? ''}
              onChange={(e) => {
                const cid = e.target.value || null
                const cls = classes.find((c) => c.id === cid)
                setForm({ ...form, class_id: cid, major_id: cls?.major_id ?? form.major_id ?? null })
              }}
            >
              <option value="">— Pilih Kelas —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Jurusan</label>
            <select className="select" value={form.major_id ?? ''} onChange={(e) => setForm({ ...form, major_id: e.target.value || null })}>
              <option value="">— Pilih Jurusan —</option>
              {majors.map((m) => (
                <option key={m.id} value={m.id}>{m.code} · {m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nama Orang Tua</label>
            <input className="input" value={form.parent_name ?? ''} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} placeholder="Nama orang tua / wali" />
          </div>
          <div>
            <label className="label">No. HP Orang Tua</label>
            <input className="input" value={form.parent_phone ?? ''} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} placeholder="08xxxxxxxxxx" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Alamat</label>
            <textarea className="textarea" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat tempat tinggal" />
          </div>
        </div>
        <div className="form-actions">
          <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Batal</button>
          <button onClick={submit} className="btn btn-primary" disabled={pending}>
            {pending ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Tambah Siswa'}
          </button>
        </div>
      </Modal>

      {/* Bulk delete confirm modal */}
      <Modal open={bulkDeleteConfirm} onClose={() => setBulkDeleteConfirm(false)} title="Hapus Siswa Keluar">
        {bulkError && (
          <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{bulkError}</span>
          </div>
        )}
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Hapus {droppedSelected.length} siswa berstatus Keluar secara permanen? Seluruh riwayat tagihan & pembayaran siswa tersebut akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="form-actions">
          <button onClick={() => setBulkDeleteConfirm(false)} className="btn btn-secondary">Batal</button>
          <button onClick={confirmBulkDelete} className="btn btn-primary" disabled={pending}>{pending ? 'Menghapus…' : 'Hapus'}</button>
        </div>
      </Modal>
    </div>
  )
}
