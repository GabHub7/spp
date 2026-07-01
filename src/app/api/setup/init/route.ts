import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/, 'Username hanya huruf, angka, titik, underscore'),
  fullName: z.string().trim().min(3).max(100),
  email: z.string().trim().toLowerCase().email('Format email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Harus mengandung huruf besar')
    .regex(/[a-z]/, 'Harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Harus mengandung angka'),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' },
      { status: 400 }
    )
  }
  const { username, fullName, email, password } = parsed.data

  const service = createServiceClient()

  // Determine the ADMIN role id.
  const { data: adminRole } = await service.from('roles').select('id').eq('name', 'ADMIN').single()
  if (!adminRole) {
    return NextResponse.json(
      { error: 'Role ADMIN belum ada. Jalankan migrasi database terlebih dahulu.' },
      { status: 500 }
    )
  }

  // Only allowed when no admin exists yet, unless a setup secret is provided.
  const { count: adminCount } = await service
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role_id', adminRole.id)

  const setupSecret = (body as { setupSecret?: string }).setupSecret
  if ((adminCount ?? 0) > 0) {
    if (!process.env.SETUP_SECRET || setupSecret !== process.env.SETUP_SECRET) {
      return NextResponse.json(
        { error: 'Akun admin sudah ada. Setup tidak diizinkan.' },
        { status: 403 }
      )
    }
  }

  // Uniqueness check on username.
  const { data: existing } = await service
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Username sudah digunakan.' }, { status: 409 })
  }

  const { data: dupEmail } = await service.from('users').select('id').eq('email', email).maybeSingle()
  if (dupEmail) {
    return NextResponse.json({ error: 'Email sudah digunakan.' }, { status: 409 })
  }

  const { data: created, error: authErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (authErr || !created.user) {
    return NextResponse.json(
      { error: authErr?.message ?? 'Gagal membuat akun.' },
      { status: 500 }
    )
  }

  const { error: insertErr } = await service.from('users').insert({
    auth_id: created.user.id,
    username,
    full_name: fullName,
    email,
    role_id: adminRole.id,
    status: 'ACTIVE',
  })
  if (insertErr) {
    // Roll back the orphaned auth user so setup can be retried.
    await service.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, username })
}
