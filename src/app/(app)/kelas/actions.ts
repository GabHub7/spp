'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession, can } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

export interface ActionResult { ok?: boolean; error?: string }

const schema = z.object({
  name: z.string().trim().min(1, 'Nama kelas wajib').max(50),
  grade: z.string().trim().min(1, 'Tingkat wajib diisi').max(20),
  major_id: z.string().uuid().nullable().optional(),
})

async function guard() {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' as const }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' as const }
  return { ctx }
}

export async function saveClass(id: string | null, input: z.input<typeof schema>): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const { name, grade, major_id } = parsed.data
  const { serviceClient } = g.ctx

  const { data: dup } = await serviceClient.from('classes').select('id').eq('name', name).maybeSingle()
  if (dup && dup.id !== id) return { error: `Kelas ${name} sudah ada.` }

  const res = id
    ? await serviceClient.from('classes').update({ name, grade, major_id: major_id || null }).eq('id', id)
    : await serviceClient.from('classes').insert({ name, grade, major_id: major_id || null })
  if (res.error) return { error: res.error.message }

  await logAudit(serviceClient, g.ctx.user, { action: id ? 'UPDATE' : 'CREATE', entity: 'class', entityId: id ?? undefined, detail: `Kelas ${name}` })
  revalidatePath('/kelas')
  return { ok: true }
}

export async function deleteClass(id: string): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const { serviceClient } = g.ctx
  const { count } = await serviceClient.from('students').select('id', { count: 'exact', head: true }).eq('class_id', id)
  if ((count ?? 0) > 0) return { error: 'Kelas masih memiliki siswa.' }
  const { error } = await serviceClient.from('classes').delete().eq('id', id)
  if (error) return { error: error.message }
  await logAudit(serviceClient, g.ctx.user, { action: 'DELETE', entity: 'class', entityId: id })
  revalidatePath('/kelas')
  return { ok: true }
}
