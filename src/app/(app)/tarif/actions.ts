'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession, can } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

export interface ActionResult { ok?: boolean; error?: string }

const schema = z.object({
  academic_year_id: z.string().uuid('Pilih tahun ajaran'),
  amount: z.coerce.number().min(1000, 'Minimal Rp1.000').max(10000000, 'Maksimal Rp10.000.000'),
  note: z.string().trim().max(120).optional().or(z.literal('')),
})

export async function addRate(input: z.input<typeof schema>): Promise<ActionResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const { academic_year_id, amount, note } = parsed.data
  const { serviceClient } = ctx

  const { error } = await serviceClient
    .from('spp_rates')
    .insert({ academic_year_id, amount, note: note || null })
  if (error) return { error: error.message }

  await logAudit(serviceClient, ctx.user, { action: 'CREATE', entity: 'spp_rate', detail: `Tarif SPP Rp${amount}` })
  revalidatePath('/tarif')
  return { ok: true }
}

export async function updateRate(id: string, input: z.input<typeof schema>): Promise<ActionResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const { academic_year_id, amount, note } = parsed.data
  const { serviceClient } = ctx

  const { error } = await serviceClient
    .from('spp_rates')
    .update({ academic_year_id, amount, note: note || null })
    .eq('id', id)
  if (error) return { error: error.message }

  await logAudit(serviceClient, ctx.user, { action: 'UPDATE', entity: 'spp_rate', entityId: id, detail: `Ubah tarif SPP → Rp${amount}` })
  revalidatePath('/tarif')
  return { ok: true }
}

export async function deleteRate(id: string): Promise<ActionResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' }
  const { serviceClient } = ctx

  const { error } = await serviceClient.from('spp_rates').delete().eq('id', id)
  if (error) return { error: error.message }

  await logAudit(serviceClient, ctx.user, { action: 'DELETE', entity: 'spp_rate', entityId: id, detail: 'Hapus tarif SPP' })
  revalidatePath('/tarif')
  return { ok: true }
}
