'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, AlertTriangle, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LupaPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const value = email.trim()
    if (!value) {
      setError('Masukkan alamat email Anda.')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      // The reset link returns to the SAME origin the user is on now, so it
      // works for both poncolspp.web.id and spp-rust.vercel.app automatically.
      const { error: err } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      // Don't reveal whether the email exists — always show the same result.
      if (err && !/rate|limit/i.test(err.message)) {
        setError(err.message)
      } else {
        setDone(true)
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
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Periksa email Anda</h2>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          Jika <span className="font-semibold">{email}</span> terdaftar, kami telah mengirim tautan untuk
          mengatur ulang password. Cek juga folder spam.
        </p>
        <Link href="/login" className="btn btn-secondary w-full mt-5">
          <ArrowLeft size={16} /> Kembali ke Masuk
        </Link>
      </div>
    )
  }

  return (
    <div className="clay-raised p-6 sm:p-7">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={20} style={{ color: 'var(--accent)' }} />
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Lupa Password</h2>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        Masukkan email yang terdaftar. Kami akan mengirim tautan untuk membuat password baru.
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }} role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <div className="relative">
            <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="input pl-10"
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary w-full mt-1" disabled={loading}>
          {loading ? 'Mengirim…' : 'Kirim Tautan Reset'}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <Link href="/login" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
          Kembali ke halaman Masuk
        </Link>
      </div>
    </div>
  )
}
