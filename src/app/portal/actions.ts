'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

export interface ActionResult { ok?: boolean; error?: string }

const nisSchema = z.string().trim().min(1, 'NIS wajib diisi')

/** Links another child (by NIS) to the logged-in parent account. */
export async function addChild(nis: string): Promise<ActionResult> {
  const ctx = await getSession()
  if (!ctx || ctx.user.role !== 'ORANG_TUA') return { error: 'Sesi berakhir.' }
  const parsed = nisSchema.safeParse(nis)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const { serviceClient, user } = ctx
  const { data: student } = await serviceClient
    .from('students')
    .select('id, full_name, parent_user_id')
    .eq('nis', parsed.data)
    .maybeSingle()
  if (!student) return { error: 'NIS tidak ditemukan.' }
  if (student.parent_user_id === user.id) return { error: 'Anak ini sudah ada di akun Anda.' }
  if (student.parent_user_id) return { error: 'Siswa ini sudah terhubung dengan akun orang tua lain.' }

  const { error } = await serviceClient
    .from('students')
    .update({ parent_user_id: user.id })
    .eq('id', student.id)
  if (error) return { error: error.message }

  await logAudit(serviceClient, user, {
    action: 'LINK_CHILD',
    entity: 'student',
    entityId: student.id,
    detail: `Tambah anak ${student.full_name} (${parsed.data})`,
  })
  revalidatePath('/portal')
  return { ok: true }
}
