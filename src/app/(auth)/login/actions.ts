'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkAuthRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { headers } from 'next/headers'

const MAX_FAILED = 5
const LOCK_MINUTES = 15

export interface LoginResult {
  ok?: boolean
  error?: string
  role?: string
}

export async function loginAction(_prev: LoginResult, formData: FormData): Promise<LoginResult> {
  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!username || !password) {
    return { error: 'Username dan password wajib diisi.' }
  }

  // Rate limit by IP (fail-open if Upstash is not configured).
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon'
  const rl = await checkAuthRateLimit(`login:${ip}`)
  if (!rl.success) {
    return { error: 'Terlalu banyak percobaan. Coba lagi dalam beberapa saat.' }
  }

  const service = createServiceClient()
  const { data: account } = await service
    .from('users')
    .select('id, username, email, status, failed_logins, locked_until, roles(name)')
    .or(`username.eq.${username},email.eq.${username}`)
    .maybeSingle()

  if (!account || !account.email) {
    return { error: 'Username atau password salah.' }
  }
  if (account.status !== 'ACTIVE') {
    return { error: 'Akun dinonaktifkan. Hubungi admin.' }
  }
  if (account.locked_until && new Date(account.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(account.locked_until).getTime() - Date.now()) / 60000)
    return { error: `Akun terkunci. Coba lagi dalam ${mins} menit.` }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password,
  })

  if (error) {
    const failed = (account.failed_logins ?? 0) + 1
    const lock = failed >= MAX_FAILED
    await service
      .from('users')
      .update({
        failed_logins: lock ? 0 : failed,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      })
      .eq('id', account.id)
    return {
      error: lock
        ? `Gagal login ${MAX_FAILED} kali. Akun terkunci ${LOCK_MINUTES} menit.`
        : 'Username atau password salah.',
    }
  }

  await service.from('users').update({ failed_logins: 0, locked_until: null }).eq('id', account.id)

  const rel = account.roles
  const roleName = (Array.isArray(rel) ? rel[0] : rel)?.name ?? 'UNKNOWN'
  await logAudit(service, { id: account.id, username: account.username, role: roleName }, {
    action: 'LOGIN',
    entity: 'auth',
  })

  return { ok: true, role: roleName }
}
