'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession, can } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

export interface ActionResult { ok?: boolean; error?: string }

const schema = z.object({
  name: z.string().trim().regex(/^\d{4}\/\d{4}$/, 'Format: 2026/2027'),
  is_active: z.boolean().default(false),
})

async function guard() {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' as const }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' as const }
  return { ctx }
}

export async function createYear(input: z.input<typeof schema>): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const { name, is_active } = parsed.data
  const { serviceClient } = g.ctx

  const { data: dup } = await serviceClient.from('academic_years').select('id').eq('name', name).maybeSingle()
  if (dup) return { error: `Tahun ajaran ${name} sudah ada.` }

  if (is_active) {
    await serviceClient.from('academic_years').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
  }
  const { error } = await serviceClient.from('academic_years').insert({ name, is_active })
  if (error) return { error: error.message }

  await logAudit(serviceClient, g.ctx.user, { action: 'CREATE', entity: 'academic_year', detail: `Tahun ajaran ${name}` })
  revalidatePath('/tahun-ajaran')
  return { ok: true }
}

/** Activate exactly one academic year (BR-010). */
export async function setActiveYear(id: string): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const { serviceClient } = g.ctx

  await serviceClient.from('academic_years').update({ is_active: false }).neq('id', id)
  const { error } = await serviceClient.from('academic_years').update({ is_active: true }).eq('id', id)
  if (error) return { error: error.message }

  await logAudit(serviceClient, g.ctx.user, { action: 'ACTIVATE', entity: 'academic_year', entityId: id })
  revalidatePath('/tahun-ajaran')
  return { ok: true }
}
