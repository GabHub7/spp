'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession, can } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

export interface ActionResult { ok?: boolean; error?: string }

const schema = z.object({
  code: z.string().trim().min(1, 'Kode wajib').max(10),
  name: z.string().trim().min(2, 'Nama wajib').max(100),
})

async function guard() {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' as const }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' as const }
  return { ctx }
}

export async function saveMajor(id: string | null, input: z.input<typeof schema>): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const { code, name } = parsed.data
  const { serviceClient } = g.ctx

  const { data: dup } = await serviceClient.from('majors').select('id').eq('code', code).maybeSingle()
  if (dup && dup.id !== id) return { error: `Kode ${code} sudah ada.` }

  const res = id
    ? await serviceClient.from('majors').update({ code, name }).eq('id', id)
    : await serviceClient.from('majors').insert({ code, name })
  if (res.error) return { error: res.error.message }

  await logAudit(serviceClient, g.ctx.user, { action: id ? 'UPDATE' : 'CREATE', entity: 'major', entityId: id ?? undefined, detail: `Jurusan ${code}` })
  revalidatePath('/jurusan')
  return { ok: true }
}
