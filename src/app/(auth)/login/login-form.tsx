'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Lock, Eye, EyeOff, AlertTriangle, LogIn } from 'lucide-react'
import { loginAction, type LoginResult } from './actions'

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState<LoginResult, FormData>(loginAction, {})
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    if (state.ok) {
      const dest = state.role === 'ORANG_TUA' ? '/portal' : redirectTo
      router.push(dest)
      router.refresh()
    }
  }, [state.ok, state.role, redirectTo, router])

  return (
    <div className="clay-raised p-6 sm:p-7">
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Masuk ke Akun
      </h2>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        Gunakan akun Admin, Bendahara, atau Kepala Sekolah.
      </p>

      {state.error && (
        <div
          className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 mb-4 text-sm"
          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
          role="alert"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="username">
            Username
          </label>
          <div className="relative">
            <User
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              placeholder="cth. admin"
              className="input pl-10"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">
              Password
            </label>
            <Link href="/lupa-password" className="text-xs font-semibold mb-1.5" style={{ color: 'var(--accent)' }}>
              Lupa password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              id="password"
              name="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="Masukkan password"
              className="input pl-10 pr-10"
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

        <button type="submit" className="btn btn-primary w-full mt-1" disabled={pending}>
          {pending ? (
            <span
              className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white"
              style={{ animation: 'spin 0.6s linear infinite' }}
            />
          ) : (
            <LogIn size={17} />
          )}
          {pending ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Orang tua/wali siswa?{' '}
          <Link href="/daftar" className="font-semibold" style={{ color: 'var(--accent)' }}>
            Daftar di sini
          </Link>
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Belum ada akun admin?{' '}
          <Link href="/setup" className="font-semibold" style={{ color: 'var(--accent)' }}>
            Buat akun pertama
          </Link>
        </p>
      </div>
    </div>
  )
}
