'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'

export function SetupForm() {
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
      const res = await fetch('/api/setup/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: fd.get('username'),
          fullName: fd.get('fullName'),
          email: fd.get('email'),
          password: fd.get('password'),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Gagal membuat akun.')
      } else {
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
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Akun admin berhasil dibuat
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Mengalihkan ke halaman masuk…
        </p>
      </div>
    )
  }

  return (
    <div className="clay-raised p-6 sm:p-7">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={20} style={{ color: 'var(--accent)' }} />
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Setup Admin Pertama
        </h2>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        Buat akun Admin pertama. Halaman ini nonaktif setelah admin tersedia.
      </p>

      {error && (
        <div
          className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm"
          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
          role="alert"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="fullName">Nama Lengkap</label>
          <input id="fullName" name="fullName" required minLength={3} className="input" placeholder="cth. Budi Santoso" />
        </div>
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" name="username" required minLength={3} className="input" placeholder="cth. admin" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" placeholder="cth. admin@email.com" />
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Dipakai untuk pemulihan password jika lupa.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required minLength={8} className="input" placeholder="Min. 8 karakter, huruf besar, kecil, angka" />
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka.
          </p>
        </div>
        <button type="submit" className="btn btn-primary w-full mt-1" disabled={loading}>
          {loading ? 'Membuat…' : 'Buat Akun Admin'}
        </button>
      </form>

      <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
        Sudah punya akun?{' '}
        <Link href="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>
          Masuk
        </Link>
      </p>
    </div>
  )
}
