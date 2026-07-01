'use client'

/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wallet, Users, DatabaseBackup, Plus, Save, Download, Upload,
  AlertTriangle, CheckCircle2, UserCog, QrCode, Mail, School, Image as ImageIcon, Palette,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Modal } from '@/components/ui/modal'
import { ThemeSwitcher } from '@/components/theme-toggle'
import { ROLE_LABEL, statusBadgeClass } from '@/lib/utils'
import { SCHOOL_LEVEL_LABEL, type SchoolSettings } from '@/lib/school-types'
import { savePaymentSettings, createUser, setUserStatus, updateUserEmail, updateSchoolSettings } from './actions'
import type { PaymentSettings, RoleName } from '@/types'

type StaffRole = 'ADMIN' | 'BENDAHARA' | 'KEPALA_SEKOLAH'

interface UserRow {
  id: string
  username: string
  full_name: string
  email: string | null
  status: string
  roles: { name: RoleName } | null
}

function Notice({ msg }: { msg: { ok: boolean; text: string } }) {
  return (
    <div
      className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 text-sm"
      style={{ background: msg.ok ? 'rgba(22,163,74,0.1)' : 'var(--accent-light)', color: msg.ok ? '#15803d' : 'var(--accent)' }}
    >
      {msg.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
      <span>{msg.text}</span>
    </div>
  )
}

export function PengaturanClient({
  settings, users, currentUserId, schoolSettings,
}: {
  settings: PaymentSettings | null
  users: UserRow[]
  currentUserId: string
  schoolSettings: SchoolSettings
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  // School identity / branding form
  const [sc, setSc] = useState({
    school_name: schoolSettings.school_name,
    app_name: schoolSettings.app_name,
    school_level: schoolSettings.school_level,
    logo_url: schoolSettings.logo_url ?? '',
    favicon_url: schoolSettings.favicon_url ?? '',
    primary_color: schoolSettings.primary_color,
    secondary_color: schoolSettings.secondary_color,
  })
  const [schoolMsg, setSchoolMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)
  const [brandUploading, setBrandUploading] = useState<'logo' | 'favicon' | null>(null)

  function saveSchoolSettings() {
    setSchoolMsg(null)
    start(async () => {
      const res = await updateSchoolSettings({ ...sc, school_level: sc.school_level as 'SD' | 'SMP' | 'SMA' | 'SMK' | 'LAINNYA' })
      if (res.error) setSchoolMsg({ ok: false, text: res.error })
      else { setSchoolMsg({ ok: true, text: 'Identitas aplikasi tersimpan. Muat ulang halaman untuk melihat perubahan penuh.' }); router.refresh() }
    })
  }

  async function onBrandUpload(kind: 'logo' | 'favicon', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSchoolMsg(null)
    setBrandUploading(kind)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', kind)
    try {
      const res = await fetch('/api/admin/upload-branding', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) setSchoolMsg({ ok: false, text: data.error ?? 'Gagal mengunggah.' })
      else setSc((prev) => ({ ...prev, [kind === 'logo' ? 'logo_url' : 'favicon_url']: data.url }))
    } catch {
      setSchoolMsg({ ok: false, text: 'Tidak dapat terhubung ke server.' })
    } finally {
      setBrandUploading(null)
      const ref = kind === 'logo' ? logoRef : faviconRef
      if (ref.current) ref.current.value = ''
    }
  }

  // Settings form
  const [s, setS] = useState({
    bank_name: settings?.bank_name ?? '',
    bank_account_no: settings?.bank_account_no ?? '',
    bank_account_holder: settings?.bank_account_holder ?? '',
    qris_provider: settings?.qris_provider ?? '',
    qris_image_url: settings?.qris_image_url ?? '',
  })
  const [settingsMsg, setSettingsMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function saveSettings() {
    setSettingsMsg(null)
    start(async () => {
      const res = await savePaymentSettings(s)
      if (res.error) setSettingsMsg({ ok: false, text: res.error })
      else { setSettingsMsg({ ok: true, text: 'Pengaturan tersimpan.' }); router.refresh() }
    })
  }

  // User modal
  const [userModal, setUserModal] = useState(false)
  const [uForm, setUForm] = useState<{ username: string; full_name: string; email: string; role: StaffRole; password: string }>({ username: '', full_name: '', email: '', role: 'BENDAHARA', password: '' })
  const [uError, setUError] = useState<string | null>(null)

  function submitUser() {
    setUError(null)
    start(async () => {
      const res = await createUser(uForm)
      if (res.error) setUError(res.error)
      else { setUserModal(false); setUForm({ username: '', full_name: '', email: '', role: 'BENDAHARA', password: '' }); router.refresh() }
    })
  }

  function toggleStatus(u: UserRow) {
    start(async () => {
      const res = await setUserStatus(u.id, u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
      if (res.error) alert(res.error)
      else router.refresh()
    })
  }

  // Edit-email modal
  const [emailUser, setEmailUser] = useState<UserRow | null>(null)
  const [emailValue, setEmailValue] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  function openEmail(u: UserRow) {
    setEmailUser(u)
    setEmailValue(u.email && !u.email.endsWith('.local') ? u.email : '')
    setEmailError(null)
  }

  function submitEmail() {
    if (!emailUser) return
    setEmailError(null)
    start(async () => {
      const res = await updateUserEmail(emailUser.id, emailValue)
      if (res.error) setEmailError(res.error)
      else { setEmailUser(null); router.refresh() }
    })
  }

  // QRIS image upload
  const qrisRef = useRef<HTMLInputElement>(null)
  const [qrisUploading, setQrisUploading] = useState(false)

  async function onQrisUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSettingsMsg(null)
    setQrisUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/admin/upload-qris', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) setSettingsMsg({ ok: false, text: data.error ?? 'Gagal mengunggah QRIS.' })
      else {
        setS((prev) => ({ ...prev, qris_image_url: data.url }))
        setSettingsMsg({ ok: true, text: 'Gambar QRIS berhasil diunggah.' })
        router.refresh()
      }
    } catch {
      setSettingsMsg({ ok: false, text: 'Tidak dapat terhubung ke server.' })
    } finally {
      setQrisUploading(false)
      if (qrisRef.current) qrisRef.current.value = ''
    }
  }

  // Restore
  const restoreRef = useRef<HTMLInputElement>(null)
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function onRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('Pulihkan data dari file backup ini? Data dengan ID yang sama akan ditimpa.')) {
      if (restoreRef.current) restoreRef.current.value = ''
      return
    }
    setRestoreMsg(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/restore', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) setRestoreMsg({ ok: false, text: data.error ?? 'Gagal memulihkan.' })
      else { setRestoreMsg({ ok: true, text: `${data.restored} baris dipulihkan.` }); router.refresh() }
    } catch {
      setRestoreMsg({ ok: false, text: 'Tidak dapat terhubung ke server.' })
    } finally {
      if (restoreRef.current) restoreRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pengaturan" description="Identitas aplikasi, metode pembayaran, pengguna, tampilan, dan backup data." />

      {/* School / app identity (white-label) */}
      <section className="clay p-5">
        <div className="flex items-center gap-2 mb-1">
          <School size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Identitas Aplikasi & Sekolah</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Sesuaikan nama, logo, favicon, dan warna tema tanpa mengubah kode — cocok dipakai untuk sekolah mana pun (SD/SMP/SMA/SMK).
        </p>
        {schoolMsg && <div className="mb-4"><Notice msg={schoolMsg} /></div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nama Sekolah</label>
            <input className="input" value={sc.school_name} onChange={(e) => setSc({ ...sc, school_name: e.target.value })} placeholder="cth. SMK Poncol Jakarta" />
          </div>
          <div>
            <label className="label">Nama Aplikasi</label>
            <input className="input" value={sc.app_name} onChange={(e) => setSc({ ...sc, app_name: e.target.value })} placeholder="cth. PoncolPay" />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Tampil di sidebar, judul tab browser, dan struk.</p>
          </div>
          <div>
            <label className="label">Tingkat Sekolah</label>
            <select className="select" value={sc.school_level} onChange={(e) => setSc({ ...sc, school_level: e.target.value })}>
              {Object.entries(SCHOOL_LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Logo */}
          <div>
            <label className="label flex items-center gap-1.5"><ImageIcon size={13} /> Logo Sekolah</label>
            <div className="flex items-center gap-3 mb-2">
              <div className="grid place-items-center rounded-[14px] shrink-0" style={{ width: 56, height: 56, background: 'var(--bg-input)', boxShadow: 'var(--clay-inset)' }}>
                {sc.logo_url ? <img src={sc.logo_url} alt="Logo" className="max-w-[44px] max-h-[44px] object-contain" /> : <ImageIcon size={20} style={{ color: 'var(--text-muted)' }} />}
              </div>
              <button type="button" onClick={() => logoRef.current?.click()} className="btn btn-secondary btn-sm" disabled={brandUploading === 'logo'}>
                <Upload size={14} /> {brandUploading === 'logo' ? 'Mengunggah…' : 'Unggah dari Perangkat'}
              </button>
              <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => onBrandUpload('logo', e)} />
            </div>
            <input className="input" value={sc.logo_url} onChange={(e) => setSc({ ...sc, logo_url: e.target.value })} placeholder="atau tempel URL gambar logo…" />
          </div>

          {/* Favicon */}
          <div>
            <label className="label flex items-center gap-1.5"><ImageIcon size={13} /> Favicon</label>
            <div className="flex items-center gap-3 mb-2">
              <div className="grid place-items-center rounded-[14px] shrink-0" style={{ width: 56, height: 56, background: 'var(--bg-input)', boxShadow: 'var(--clay-inset)' }}>
                {sc.favicon_url ? <img src={sc.favicon_url} alt="Favicon" className="max-w-[32px] max-h-[32px] object-contain" /> : <ImageIcon size={20} style={{ color: 'var(--text-muted)' }} />}
              </div>
              <button type="button" onClick={() => faviconRef.current?.click()} className="btn btn-secondary btn-sm" disabled={brandUploading === 'favicon'}>
                <Upload size={14} /> {brandUploading === 'favicon' ? 'Mengunggah…' : 'Unggah dari Perangkat'}
              </button>
              <input ref={faviconRef} type="file" accept="image/png,image/x-icon,image/svg+xml" className="hidden" onChange={(e) => onBrandUpload('favicon', e)} />
            </div>
            <input className="input" value={sc.favicon_url} onChange={(e) => setSc({ ...sc, favicon_url: e.target.value })} placeholder="atau tempel URL gambar favicon…" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label flex items-center gap-1.5"><Palette size={13} /> Warna Utama</label>
            <div className="flex items-center gap-2">
              <input type="color" value={sc.primary_color} onChange={(e) => setSc({ ...sc, primary_color: e.target.value })} className="w-11 h-11 rounded-[10px] cursor-pointer border-0 p-0.5" style={{ background: 'var(--bg-input)' }} />
              <input className="input" value={sc.primary_color} onChange={(e) => setSc({ ...sc, primary_color: e.target.value })} placeholder="#d11f2d atau rgb(209,31,45)" />
            </div>
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Palette size={13} /> Warna Kedua</label>
            <div className="flex items-center gap-2">
              <input type="color" value={sc.secondary_color} onChange={(e) => setSc({ ...sc, secondary_color: e.target.value })} className="w-11 h-11 rounded-[10px] cursor-pointer border-0 p-0.5" style={{ background: 'var(--bg-input)' }} />
              <input className="input" value={sc.secondary_color} onChange={(e) => setSc({ ...sc, secondary_color: e.target.value })} placeholder="#f47a1f atau rgb(244,122,31)" />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={saveSchoolSettings} className="btn btn-primary" disabled={pending}><Save size={16} /> Simpan Identitas</button>
        </div>
      </section>

      {/* Payment settings */}
      <section className="clay p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Metode Pembayaran</h2>
        </div>
        {settingsMsg && <div className="mb-4"><Notice msg={settingsMsg} /></div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Nama Bank</label><input className="input" value={s.bank_name} onChange={(e) => setS({ ...s, bank_name: e.target.value })} placeholder="cth. Bank BRI" /></div>
          <div><label className="label">Nomor Rekening</label><input className="input" value={s.bank_account_no} onChange={(e) => setS({ ...s, bank_account_no: e.target.value })} placeholder="cth. 0000-01-..." /></div>
          <div><label className="label">Nama Pemilik Rekening</label><input className="input" value={s.bank_account_holder} onChange={(e) => setS({ ...s, bank_account_holder: e.target.value })} placeholder="cth. SMK Poncol Jakarta" /></div>
          <div><label className="label">Provider QRIS (opsional)</label><input className="input" value={s.qris_provider} onChange={(e) => setS({ ...s, qris_provider: e.target.value })} placeholder="cth. Midtrans / Xendit" /></div>
          <div className="sm:col-span-2">
            <label className="label">Gambar QRIS Statis</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="grid place-items-center rounded-[16px] shrink-0" style={{ width: 140, height: 140, background: 'var(--bg-input)', boxShadow: 'var(--clay-inset)' }}>
                {s.qris_image_url ? (
                  <img src={s.qris_image_url} alt="QRIS" className="max-w-[124px] max-h-[124px] rounded-[10px]" />
                ) : (
                  <QrCode size={40} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              <div className="flex-1">
                <button type="button" onClick={() => qrisRef.current?.click()} className="btn btn-accent2 btn-sm" disabled={qrisUploading}>
                  <Upload size={16} /> {qrisUploading ? 'Mengunggah…' : 'Unggah Gambar QRIS'}
                </button>
                <input ref={qrisRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onQrisUpload} />
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Gambar QRIS akan ditampilkan ke orang tua saat membayar. Format JPG/PNG/WEBP, maks 5 MB.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <button onClick={saveSettings} className="btn btn-primary" disabled={pending}><Save size={16} /> Simpan</button>
        </div>
      </section>

      {/* Appearance */}
      <section className="clay p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserCog size={18} style={{ color: 'var(--accent-2)' }} />
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Tampilan</h2>
        </div>
        <ThemeSwitcher />
      </section>

      {/* Users */}
      <section className="clay overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Users size={18} style={{ color: 'var(--accent)' }} />
            <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Pengguna</h2>
          </div>
          <button onClick={() => { setUError(null); setUserModal(true) }} className="btn btn-primary btn-sm"><Plus size={16} /> Tambah Pengguna</button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table data-cards">
            <thead><tr><th>Nama</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const noRealEmail = !u.email || u.email.endsWith('.local')
                return (
                <tr key={u.id}>
                  <td className="font-semibold" data-label="Nama">{u.full_name}</td>
                  <td className="font-mono text-xs" data-label="Username">@{u.username}</td>
                  <td className="text-xs" data-label="Email">
                    {noRealEmail
                      ? <span style={{ color: 'var(--text-muted)' }}>belum diatur</span>
                      : <span style={{ color: 'var(--text-secondary)' }}>{u.email}</span>}
                  </td>
                  <td data-label="Role">{u.roles ? ROLE_LABEL[u.roles.name] : '—'}</td>
                  <td data-label="Status"><span className={`badge ${statusBadgeClass(u.status)}`}>{u.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className="text-right" data-label="Aksi">
                    <div className="inline-flex gap-1">
                      <button onClick={() => openEmail(u)} className="btn btn-ghost btn-sm" disabled={pending}>
                        <Mail size={14} /> Email
                      </button>
                      {u.id !== currentUserId && (
                        <button onClick={() => toggleStatus(u)} className="btn btn-ghost btn-sm" disabled={pending}>
                          {u.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </section>

      {/* Backup & restore */}
      <section className="clay p-5">
        <div className="flex items-center gap-2 mb-4">
          <DatabaseBackup size={18} style={{ color: 'var(--accent-2)' }} />
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Backup &amp; Restore</h2>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Backup JSON dipakai untuk memulihkan (restore) data. Backup Excel bersifat baca-saja — untuk arsip yang mudah dibaca manusia.
        </p>
        {restoreMsg && <div className="mb-4"><Notice msg={restoreMsg} /></div>}
        <div className="flex flex-wrap gap-2">
          <a href="/api/backup" className="btn btn-secondary"><Download size={16} /> Backup JSON (Restore)</a>
          <a href="/api/backup/excel" className="btn btn-secondary"><Download size={16} /> Backup Excel</a>
          <button onClick={() => restoreRef.current?.click()} className="btn btn-accent2"><Upload size={16} /> Restore dari File JSON</button>
          <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={onRestore} />
        </div>
      </section>

      {/* Add user modal */}
      <Modal open={userModal} onClose={() => setUserModal(false)} title="Tambah Pengguna">
        {uError && (
          <div className="mb-4"><Notice msg={{ ok: false, text: uError }} /></div>
        )}
        <div className="flex flex-col gap-4">
          <div><label className="label">Nama Lengkap</label><input className="input" value={uForm.full_name} onChange={(e) => setUForm({ ...uForm, full_name: e.target.value })} /></div>
          <div><label className="label">Username</label><input className="input" value={uForm.username} onChange={(e) => setUForm({ ...uForm, username: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={uForm.email} onChange={(e) => setUForm({ ...uForm, email: e.target.value })} placeholder="cth. nama@email.com" /><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Untuk pemulihan password lewat email.</p></div>
          <div>
            <label className="label">Role</label>
            <select className="select" value={uForm.role} onChange={(e) => setUForm({ ...uForm, role: e.target.value as StaffRole })}>
              <option value="ADMIN">Admin</option>
              <option value="BENDAHARA">Bendahara</option>
              <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
            </select>
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" autoComplete="off" data-1p-ignore data-lpignore="true" value={uForm.password} onChange={(e) => setUForm({ ...uForm, password: e.target.value })} placeholder="Min. 8 karakter, huruf besar, kecil, angka" />
          </div>
        </div>
        <div className="form-actions">
          <button onClick={() => setUserModal(false)} className="btn btn-secondary">Batal</button>
          <button onClick={submitUser} className="btn btn-primary" disabled={pending}>{pending ? 'Menyimpan…' : 'Tambah'}</button>
        </div>
      </Modal>

      {/* Edit email modal */}
      <Modal open={!!emailUser} onClose={() => setEmailUser(null)} title={`Ubah Email · ${emailUser?.full_name ?? ''}`}>
        {emailError && <div className="mb-4"><Notice msg={{ ok: false, text: emailError }} /></div>}
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Email ini dipakai untuk masuk pemulihan password. Memperbaruinya juga memperbarui akun login.
        </p>
        <label className="label">Email</label>
        <input className="input" type="email" value={emailValue} onChange={(e) => setEmailValue(e.target.value)} placeholder="cth. nama@email.com" />
        <div className="form-actions">
          <button onClick={() => setEmailUser(null)} className="btn btn-secondary">Batal</button>
          <button onClick={submitEmail} className="btn btn-primary" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </Modal>
    </div>
  )
}
