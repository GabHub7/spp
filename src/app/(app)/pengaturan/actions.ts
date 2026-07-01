'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession, can } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'
import { parseColorToHex } from '@/lib/color'

export interface ActionResult { ok?: boolean; error?: string }

async function adminGuard() {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' as const }
  if (!can(ctx.user.role, 'manageUsers')) return { error: 'Hanya admin yang diizinkan.' as const }
  return { ctx }
}

const schoolSettingsSchema = z.object({
  school_name: z.string().trim().min(2, 'Nama sekolah minimal 2 karakter').max(100),
  app_name: z.string().trim().min(2, 'Nama aplikasi minimal 2 karakter').max(40),
  school_level: z.enum(['SD', 'SMP', 'SMA', 'SMK', 'LAINNYA']),
  logo_url: z.string().trim().max(500).optional().or(z.literal('')),
  favicon_url: z.string().trim().max(500).optional().or(z.literal('')),
  primary_color: z.string().trim().min(1),
  secondary_color: z.string().trim().min(1),
})

/** Updates this deployment's white-label identity (name, logo, favicon, theme colors). */
export async function updateSchoolSettings(input: z.input<typeof schoolSettingsSchema>): Promise<ActionResult> {
  const g = await adminGuard()
  if ('error' in g) return { error: g.error }
  const parsed = schoolSettingsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const v = parsed.data
  const { serviceClient } = g.ctx

  const { error } = await serviceClient.from('school_settings').upsert({
    id: 1,
    school_name: v.school_name,
    app_name: v.app_name,
    school_level: v.school_level,
    logo_url: v.logo_url || null,
    favicon_url: v.favicon_url || null,
    primary_color: parseColorToHex(v.primary_color, '#d11f2d'),
    secondary_color: parseColorToHex(v.secondary_color, '#f47a1f'),
    updated_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }

  await logAudit(serviceClient, g.ctx.user, { action: 'UPDATE', entity: 'school_settings', detail: 'Ubah identitas aplikasi/sekolah' })
  revalidatePath('/', 'layout')
  return { ok: true }
}

const settingsSchema = z.object({
  bank_name: z.string().trim().max(60).optional().or(z.literal('')),
  bank_account_no: z.string().trim().max(40).optional().or(z.literal('')),
  bank_account_holder: z.string().trim().max(80).optional().or(z.literal('')),
  qris_provider: z.string().trim().max(40).optional().or(z.literal('')),
  qris_image_url: z.string().trim().url('URL tidak valid').optional().or(z.literal('')),
})

export async function savePaymentSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const g = await adminGuard()
  if ('error' in g) return { error: g.error }
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const v = parsed.data
  const { serviceClient } = g.ctx

  const { error } = await serviceClient.from('payment_settings').upsert({
    id: 1,
    bank_name: v.bank_name || null,
    bank_account_no: v.bank_account_no || null,
    bank_account_holder: v.bank_account_holder || null,
    qris_provider: v.qris_provider || null,
    qris_image_url: v.qris_image_url || null,
    updated_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }

  await logAudit(serviceClient, g.ctx.user, { action: 'UPDATE', entity: 'payment_settings', detail: 'Ubah metode pembayaran' })
  revalidatePath('/pengaturan')
  return { ok: true }
}

const userSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/, 'Username hanya huruf, angka, titik, underscore'),
  full_name: z.string().trim().min(3).max(100),
  email: z.string().trim().toLowerCase().email('Format email tidak valid'),
  role: z.enum(['ADMIN', 'BENDAHARA', 'KEPALA_SEKOLAH']),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Harus mengandung huruf besar')
    .regex(/[a-z]/, 'Harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Harus mengandung angka'),
})

export async function createUser(input: z.input<typeof userSchema>): Promise<ActionResult> {
  const g = await adminGuard()
  if ('error' in g) return { error: g.error }
  const parsed = userSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const { username, full_name, email, role, password } = parsed.data
  const { serviceClient } = g.ctx

  const { data: roleRow } = await serviceClient.from('roles').select('id').eq('name', role).single()
  if (!roleRow) return { error: 'Role tidak ditemukan.' }

  const { data: dup } = await serviceClient.from('users').select('id').eq('username', username).maybeSingle()
  if (dup) return { error: 'Username sudah digunakan.' }

  const { data: dupEmail } = await serviceClient.from('users').select('id').eq('email', email).maybeSingle()
  if (dupEmail) return { error: 'Email sudah digunakan.' }

  const { data: created, error: authErr } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })
  if (authErr || !created.user) return { error: authErr?.message ?? 'Gagal membuat akun.' }

  const { error: insErr } = await serviceClient.from('users').insert({
    auth_id: created.user.id,
    username,
    full_name,
    email,
    role_id: roleRow.id,
    status: 'ACTIVE',
  })
  if (insErr) {
    await serviceClient.auth.admin.deleteUser(created.user.id)
    return { error: insErr.message }
  }

  await logAudit(serviceClient, g.ctx.user, { action: 'CREATE', entity: 'user', detail: `Tambah pengguna ${username} (${role})` })
  revalidatePath('/pengaturan')
  return { ok: true }
}

const emailSchema = z.string().trim().toLowerCase().email('Format email tidak valid')

/**
 * Sets/updates a staff member's e-mail on BOTH the profile row and the Supabase
 * Auth account, so password-reset links can be delivered. Needed to back-fill
 * accounts created before e-mail capture existed.
 */
export async function updateUserEmail(userId: string, emailInput: string): Promise<ActionResult> {
  const g = await adminGuard()
  if ('error' in g) return { error: g.error }
  const parsed = emailSchema.safeParse(emailInput)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const email = parsed.data
  const { serviceClient } = g.ctx

  const { data: target } = await serviceClient.from('users').select('id, auth_id').eq('id', userId).maybeSingle()
  if (!target) return { error: 'Pengguna tidak ditemukan.' }

  const { data: dupEmail } = await serviceClient.from('users').select('id').eq('email', email).neq('id', userId).maybeSingle()
  if (dupEmail) return { error: 'Email sudah dipakai pengguna lain.' }

  if (target.auth_id) {
    const { error: authErr } = await serviceClient.auth.admin.updateUserById(target.auth_id, {
      email,
      email_confirm: true,
    })
    if (authErr) return { error: authErr.message }
  }

  const { error } = await serviceClient.from('users').update({ email }).eq('id', userId)
  if (error) return { error: error.message }

  await logAudit(serviceClient, g.ctx.user, { action: 'UPDATE', entity: 'user', entityId: userId, detail: `Ubah email pengguna → ${email}` })
  revalidatePath('/pengaturan')
  return { ok: true }
}

export async function setUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<ActionResult> {
  const g = await adminGuard()
  if ('error' in g) return { error: g.error }
  if (g.ctx.user.id === userId) return { error: 'Tidak dapat menonaktifkan akun sendiri.' }
  const { serviceClient } = g.ctx

  const { error } = await serviceClient.from('users').update({ status }).eq('id', userId)
  if (error) return { error: error.message }

  await logAudit(serviceClient, g.ctx.user, { action: 'UPDATE_STATUS', entity: 'user', entityId: userId, detail: `Status pengguna → ${status}` })
  revalidatePath('/pengaturan')
  return { ok: true }
}
