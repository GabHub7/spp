'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle2, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Phase = 'checking' | 'ready' | 'invalid'

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password minimal 8 karakter.'
  if (!/[A-Z]/.test(pw)) return 'Password harus mengandung huruf besar.'
  if (!/[a-z]/.test(pw)) return 'Password harus mengandung huruf kecil.'
  if (!/[0-9]/.test(pw)) return 'Password harus mengandung angka.'
  return null
}

export function ResetPasswordForm() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('checking')
  const [showPw, setShowPw] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let settled = false
    const markReady = () => {
      if (settled) return
      settled = true
      setPhase('ready')
    }

    // The browser client parses the recovery code/hash from the URL on load and
    // emits PASSWORD_RECOVERY (or SIGNED_IN) once the session is established.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) markReady()
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady()
    })

    // Give detectSessionInUrl time to finish; if no session appeared, the link
    // is invalid/expired or was opened in a different browser.
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        setPhase('invalid')
      }
    }, 2500)

    return () => {
      clearTimeout(timer)
      sub.subscription.unsubscribe()
    }
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const pwError = validatePassword(pw)
    if (pwError) { setError(pwError); return }
    if (pw !== pw2) { setError('Konfirmasi password tidak cocok.'); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password: pw })
      if (err) {
        setError(err.message)
      } else {
        await supabase.auth.signOut()
        setDone(true)
        setTimeout(() => router.push('/login'), 2000)
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
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Password berhasil diubah</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Mengalihkan ke halaman masuk…</p>
      </div>
    )
  }

  if (phase === 'invalid') {
    return (
      <div className="clay-raised p-7 text-center">
        <AlertTriangle size={44} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Tautan tidak valid</h2>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          Tautan reset password tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.
        </p>
        <Link href="/lupa-password" className="btn btn-primary w-full mt-5">Minta Tautan Baru</Link>
      </div>
    )
  }

  return (
    <div className="clay-raised p-6 sm:p-7">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={20} style={{ color: 'var(--accent)' }} />
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Atur Ulang Password</h2>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        Buat password baru untuk akun Anda.
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }} role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="pw">Password Baru</label>
          <div className="relative">
            <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              id="pw"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Min. 8 karakter, huruf besar, kecil, angka"
              className="input pl-10 pr-10"
              disabled={phase !== 'ready'}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 press-effect"
              style={{ color: 'var(--text-muted)' }}
              aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pw2">Konfirmasi Password</label>
          <div className="relative">
            <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              id="pw2"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Ulangi password baru"
              className="input pl-10"
              disabled={phase !== 'ready'}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary w-full mt-1" disabled={loading || phase !== 'ready'}>
          {phase === 'checking' ? 'Memverifikasi tautan…' : loading ? 'Menyimpan…' : 'Simpan Password Baru'}
        </button>
      </form>
    </div>
  )
}
