'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession, can } from '@/lib/auth-guard'
import { getActiveYear } from '@/lib/queries'
import { logAudit } from '@/lib/audit'

export interface ActionResult {
  ok?: boolean
  error?: string
}

const studentSchema = z.object({
  nis: z.string().trim().min(1, 'NIS wajib diisi').max(30),
  full_name: z.string().trim().min(3, 'Nama minimal 3 karakter').max(100),
  gender: z.enum(['L', 'P']),
  class_id: z.string().uuid().nullable().optional(),
  major_id: z.string().uuid().nullable().optional(),
  parent_name: z.string().trim().max(100).optional().or(z.literal('')),
  parent_phone: z
    .string()
    .trim()
    .regex(/^0[0-9]{8,13}$/, 'Format No. HP: 08xxxxxxxxxx')
    .optional()
    .or(z.literal('')),
  address: z.string().trim().max(255).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'DROPPED']).default('ACTIVE'),
})

export type StudentInput = z.input<typeof studentSchema>

export async function createStudent(input: StudentInput): Promise<ActionResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' }

  const parsed = studentSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }
  const data = parsed.data

  const { serviceClient } = ctx
  const year = await getActiveYear(serviceClient)

  const { data: dup } = await serviceClient
    .from('students')
    .select('id')
    .eq('nis', data.nis)
    .maybeSingle()
  if (dup) return { error: `NIS ${data.nis} sudah terdaftar.` }

  const { data: row, error } = await serviceClient
    .from('students')
    .insert({
      nis: data.nis,
      full_name: data.full_name,
      gender: data.gender,
      class_id: data.class_id || null,
      major_id: data.major_id || null,
      academic_year_id: year?.id ?? null,
      parent_name: data.parent_name || null,
      parent_phone: data.parent_phone || null,
      address: data.address || null,
      status: data.status,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }

  await logAudit(serviceClient, ctx.user, {
    action: 'CREATE',
    entity: 'student',
    entityId: row.id,
    detail: `Tambah siswa ${data.full_name} (${data.nis})`,
  })
  revalidatePath('/siswa')
  return { ok: true }
}

export async function updateStudent(id: string, input: StudentInput): Promise<ActionResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' }

  const parsed = studentSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }
  const data = parsed.data
  const { serviceClient } = ctx

  const { data: dup } = await serviceClient
    .from('students')
    .select('id')
    .eq('nis', data.nis)
    .neq('id', id)
    .maybeSingle()
  if (dup) return { error: `NIS ${data.nis} sudah dipakai siswa lain.` }

  const { error } = await serviceClient
    .from('students')
    .update({
      nis: data.nis,
      full_name: data.full_name,
      gender: data.gender,
      class_id: data.class_id || null,
      major_id: data.major_id || null,
      parent_name: data.parent_name || null,
      parent_phone: data.parent_phone || null,
      address: data.address || null,
      status: data.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }

  await logAudit(serviceClient, ctx.user, {
    action: 'UPDATE',
    entity: 'student',
    entityId: id,
    detail: `Edit siswa ${data.full_name} (${data.nis})`,
  })
  revalidatePath('/siswa')
  return { ok: true }
}

export async function setStudentStatus(id: string, status: StudentInput['status']): Promise<ActionResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' }

  const { serviceClient } = ctx
  const { error } = await serviceClient
    .from('students')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }

  await logAudit(serviceClient, ctx.user, {
    action: 'UPDATE_STATUS',
    entity: 'student',
    entityId: id,
    detail: `Ubah status siswa → ${status}`,
  })
  revalidatePath('/siswa')
  return { ok: true }
}

/** Bulk status change, used by the checklist selection on the student list. */
export async function bulkSetStudentStatus(ids: string[], status: StudentInput['status']): Promise<ActionResult & { updated?: number }> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' }
  if (ids.length === 0) return { error: 'Pilih minimal satu siswa.' }

  const { serviceClient } = ctx
  const { error } = await serviceClient
    .from('students')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', ids)
  if (error) return { error: error.message }

  await logAudit(serviceClient, ctx.user, {
    action: 'BULK_UPDATE_STATUS',
    entity: 'student',
    detail: `Ubah status ${ids.length} siswa → ${status}`,
  })
  revalidatePath('/siswa')
  return { ok: true, updated: ids.length }
}

/**
 * Permanently deletes student(s). Only allowed for students already marked
 * DROPPED ("Keluar") — deleting cascades to their bills and payment history
 * (see FK on delete cascade), so this is intentionally gated and irreversible.
 */
export async function deleteStudents(ids: string[]): Promise<ActionResult & { deleted?: number }> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' }
  if (ids.length === 0) return { error: 'Pilih minimal satu siswa.' }

  const { serviceClient } = ctx
  const { data: students } = await serviceClient.from('students').select('id, status, full_name, nis').in('id', ids)
  const rows = (students ?? []) as { id: string; status: string; full_name: string; nis: string }[]
  const deletable = rows.filter((s) => s.status === 'DROPPED')
  if (deletable.length === 0) return { error: 'Hanya siswa berstatus Keluar yang dapat dihapus.' }

  const { error } = await serviceClient.from('students').delete().in('id', deletable.map((s) => s.id))
  if (error) return { error: error.message }

  await logAudit(serviceClient, ctx.user, {
    action: 'DELETE',
    entity: 'student',
    detail: `Hapus ${deletable.length} siswa (status Keluar): ${deletable.map((s) => `${s.full_name} (${s.nis})`).join(', ')}`,
  })
  revalidatePath('/siswa')
  return { ok: true, deleted: deletable.length }
}
