'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserPlus, AlertTriangle, CheckCircle2 } from 'lucide-react'

export function DaftarForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/parent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis: fd.get('nis'),
          full_name: fd.get('full_name'),
          email: fd.get('email'),
          phone: fd.get('phone'),
          username: fd.get('username'),
          password: fd.get('password'),
        }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Gagal mendaftar.')
      else {
        setDone(true)
        setTimeout(() => router.push('/login'), 1800)
      }
    } catch {
      setError('Tidak dapat terhubung ke server.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="clay-raised p-7 text-center">
        <CheckCircle2 size={44} className="mx-auto mb-3" style={{ color: '#15803d' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Pendaftaran berhasil</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Mengalihkan ke halaman masuk…</p>
      </div>
    )
  }

  return (
    <div className="clay-raised p-6 sm:p-7">
      <div className="flex items-center gap-2 mb-1">
        <UserPlus size={20} style={{ color: 'var(--accent)' }} />
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Daftar Akun Orang Tua</h2>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        Masukkan NIS anak Anda untuk membuat akun pembayaran SPP online.
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }} role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="nis">NIS Anak</label>
          <input id="nis" name="nis" required className="input" placeholder="Nomor Induk Siswa anak Anda" />
        </div>
        <div>
          <label className="label" htmlFor="full_name">Nama Orang Tua / Wali</label>
          <input id="full_name" name="full_name" required minLength={3} className="input" placeholder="Nama lengkap Anda" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" placeholder="cth. nama@email.com" />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Dipakai untuk pemulihan password jika lupa.</p>
        </div>
        <div>
          <label className="label" htmlFor="phone">No. HP (opsional)</label>
          <input id="phone" name="phone" className="input" placeholder="08xxxxxxxxxx" />
        </div>
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" name="username" required minLength={3} className="input" placeholder="cth. ortu_budi" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required minLength={8} className="input" placeholder="Min. 8 karakter, huruf besar, kecil, angka" />
        </div>
        <button type="submit" className="btn btn-primary w-full mt-1" disabled={loading}>
          {loading ? 'Mendaftar…' : 'Daftar'}
        </button>
      </form>

      <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
        Sudah punya akun?{' '}
        <Link href="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>Masuk</Link>
      </p>
    </div>
  )
}
