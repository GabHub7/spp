import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  nis: z.string().trim().min(1, 'NIS wajib diisi'),
  full_name: z.string().trim().min(3, 'Nama minimal 3 karakter').max(100),
  email: z.string().trim().toLowerCase().email('Format email tidak valid'),
  phone: z
    .string()
    .trim()
    .regex(/^0[0-9]{8,13}$/, 'Format No. HP: 08xxxxxxxxxx')
    .optional()
    .or(z.literal('')),
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/, 'Username hanya huruf, angka, titik, underscore'),
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
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 })
  }
  const { nis, full_name, email, phone, username, password } = parsed.data

  const service = createServiceClient()

  // The NIS must belong to an existing active student that no parent has claimed yet.
  const { data: student } = await service
    .from('students')
    .select('id, full_name, status, parent_user_id')
    .eq('nis', nis)
    .maybeSingle()
  if (!student) {
    return NextResponse.json({ error: 'NIS tidak ditemukan. Hubungi pihak sekolah.' }, { status: 404 })
  }
  if (student.parent_user_id) {
    return NextResponse.json({ error: 'Siswa ini sudah memiliki akun orang tua. Silakan masuk.' }, { status: 409 })
  }

  const { data: dupUser } = await service.from('users').select('id').eq('username', username).maybeSingle()
  if (dupUser) {
    return NextResponse.json({ error: 'Username sudah digunakan.' }, { status: 409 })
  }

  const { data: dupEmail } = await service.from('users').select('id').eq('email', email).maybeSingle()
  if (dupEmail) {
    return NextResponse.json({ error: 'Email sudah digunakan.' }, { status: 409 })
  }

  const { data: role } = await service.from('roles').select('id').eq('name', 'ORANG_TUA').single()
  if (!role) {
    return NextResponse.json({ error: 'Role belum tersedia. Jalankan migrasi database.' }, { status: 500 })
  }

  const { data: created, error: authErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })
  if (authErr || !created.user) {
    return NextResponse.json({ error: authErr?.message ?? 'Gagal membuat akun.' }, { status: 500 })
  }

  const { data: newUser, error: insErr } = await service
    .from('users')
    .insert({
      auth_id: created.user.id,
      username,
      full_name,
      email,
      role_id: role.id,
      status: 'ACTIVE',
    })
    .select('id')
    .single()
  if (insErr || !newUser) {
    await service.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: insErr?.message ?? 'Gagal menyimpan akun.' }, { status: 500 })
  }

  // Link the student to this parent, and store the parent contact on the student.
  await service
    .from('students')
    .update({ parent_user_id: newUser.id, parent_name: full_name, parent_phone: phone || null })
    .eq('id', student.id)

  await logAudit(service, { id: newUser.id, username, role: 'ORANG_TUA' }, {
    action: 'REGISTER',
    entity: 'parent',
    entityId: newUser.id,
    detail: `Daftar orang tua untuk siswa ${student.full_name} (${nis})`,
  })

  return NextResponse.json({ ok: true })
}
