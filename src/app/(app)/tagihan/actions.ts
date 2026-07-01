'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession, can } from '@/lib/auth-guard'
import { getActiveYear } from '@/lib/queries'
import { academicPeriods, academicYearStart, BILL_TYPE_LABEL } from '@/lib/utils'
import { logAudit } from '@/lib/audit'

export interface GenerateResult { ok?: boolean; error?: string; created?: number }

/**
 * Auto-generates monthly SPP bills for every ACTIVE student in the active
 * academic year (Modul 7 / BR-002, BR-003). Idempotent: a unique constraint
 * on (student, year, month, year-of-period) means re-running only fills gaps.
 */
export async function generateBills(): Promise<GenerateResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Hanya admin yang dapat membuat tagihan.' }

  const { serviceClient } = ctx
  const year = await getActiveYear(serviceClient)
  if (!year) return { error: 'Belum ada tahun ajaran aktif.' }

  const { data: rate } = await serviceClient
    .from('spp_rates')
    .select('amount')
    .eq('academic_year_id', year.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!rate) return { error: 'Belum ada tarif SPP untuk tahun ajaran aktif.' }

  const { data: students } = await serviceClient
    .from('students')
    .select('id')
    .eq('status', 'ACTIVE')
  if (!students || students.length === 0) return { error: 'Tidak ada siswa aktif.' }

  const periods = academicPeriods(academicYearStart(year.name))
  const amount = Number(rate.amount)

  const { data: existing } = await serviceClient
    .from('bills')
    .select('student_id,period_month,period_year')
    .eq('academic_year_id', year.id)
    .eq('bill_type', 'SPP')
  const existingSet = new Set(
    (existing ?? []).map((e: { student_id: string; period_month: number; period_year: number }) =>
      `${e.student_id}:${e.period_month}:${e.period_year}`
    )
  )

  const rows: Record<string, unknown>[] = []
  for (const s of students as { id: string }[]) {
    for (const p of periods) {
      if (existingSet.has(`${s.id}:${p.month}:${p.year}`)) continue
      rows.push({
        student_id: s.id,
        academic_year_id: year.id,
        bill_type: 'SPP',
        period_month: p.month,
        period_year: p.year,
        amount,
        paid_amount: 0,
        status: 'UNPAID',
        due_date: new Date(p.year, p.month - 1, 10).toISOString().slice(0, 10),
      })
    }
  }

  let created = 0
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000)
    const { data, error } = await serviceClient.from('bills').insert(chunk).select('id')
    if (error) return { error: error.message }
    created += data?.length ?? 0
  }

  await logAudit(serviceClient, ctx.user, {
    action: 'GENERATE',
    entity: 'bill',
    detail: `Generate tagihan TA ${year.name}: ${created} tagihan baru`,
  })
  revalidatePath('/tagihan')
  return { ok: true, created }
}

const customBillSchema = z.object({
  bill_type: z.enum(['SERAGAM', 'PTS', 'PAS', 'DAFTAR_ULANG', 'LAINNYA']),
  title: z.string().trim().min(2, 'Judul tagihan minimal 2 karakter').max(80),
  amount: z.coerce.number().min(1000, 'Minimal Rp1.000').max(100000000, 'Nominal terlalu besar'),
  target: z.string().min(1, 'Pilih sasaran siswa'), // 'ALL_ACTIVE' or a class id (uuid)
  due_date: z.string().optional().or(z.literal('')),
})

export interface CreateBillsResult { ok?: boolean; error?: string; created?: number }

/**
 * Creates a non-SPP bill (Seragam, PTS, PAS, Daftar Ulang, dll) for either all
 * active students or a specific class. Unlike monthly SPP, these are one-off and
 * not bound by the per-period uniqueness rule.
 */
export async function createCustomBills(input: z.input<typeof customBillSchema>): Promise<CreateBillsResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Hanya admin yang dapat membuat tagihan.' }

  const parsed = customBillSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const { bill_type, title, amount, target, due_date } = parsed.data

  const { serviceClient } = ctx
  const year = await getActiveYear(serviceClient)
  if (!year) return { error: 'Belum ada tahun ajaran aktif.' }

  let sQuery = serviceClient.from('students').select('id').eq('status', 'ACTIVE')
  if (target !== 'ALL_ACTIVE') sQuery = sQuery.eq('class_id', target)
  const { data: students } = await sQuery
  if (!students || students.length === 0) return { error: 'Tidak ada siswa pada sasaran ini.' }

  const now = new Date()
  const rows = (students as { id: string }[]).map((s) => ({
    student_id: s.id,
    academic_year_id: year.id,
    bill_type,
    title,
    period_month: now.getMonth() + 1,
    period_year: now.getFullYear(),
    amount,
    paid_amount: 0,
    status: 'UNPAID',
    due_date: due_date || null,
  }))

  let created = 0
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000)
    const { data, error } = await serviceClient.from('bills').insert(chunk).select('id')
    if (error) return { error: error.message }
    created += data?.length ?? 0
  }

  await logAudit(serviceClient, ctx.user, {
    action: 'CREATE',
    entity: 'bill',
    detail: `Buat tagihan ${BILL_TYPE_LABEL[bill_type] ?? bill_type} "${title}" Rp${amount}: ${created} tagihan`,
  })
  revalidatePath('/tagihan')
  return { ok: true, created }
}

const updateBillSchema = z.object({
  amount: z.coerce.number().min(1000, 'Minimal Rp1.000').max(100000000, 'Nominal terlalu besar'),
  title: z.string().trim().max(80).optional().or(z.literal('')),
})

export interface BillActionResult { ok?: boolean; error?: string }

/**
 * Updates a single bill's nominal (and title, for non-SPP types). Blocked once
 * any payment has been recorded against it, since changing the amount after
 * money has changed hands would desync paid_amount / receipts.
 */
export async function updateBill(id: string, input: z.input<typeof updateBillSchema>): Promise<BillActionResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' }

  const parsed = updateBillSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const { serviceClient } = ctx

  const { data: bill } = await serviceClient
    .from('bills')
    .select('id, bill_type, paid_amount, is_locked')
    .eq('id', id)
    .maybeSingle()
  const b = bill as { id: string; bill_type: string; paid_amount: number; is_locked: boolean } | null
  if (!b) return { error: 'Tagihan tidak ditemukan.' }
  if (Number(b.paid_amount) > 0) return { error: 'Tagihan sudah ada pembayaran, tidak dapat diubah nominalnya.' }
  if (b.is_locked) return { error: 'Tagihan terkunci.' }

  const update: Record<string, unknown> = { amount: parsed.data.amount }
  if (b.bill_type !== 'SPP' && parsed.data.title) update.title = parsed.data.title

  const { error } = await serviceClient.from('bills').update(update).eq('id', id)
  if (error) return { error: error.message }

  await logAudit(serviceClient, ctx.user, { action: 'UPDATE', entity: 'bill', entityId: id, detail: `Ubah nominal tagihan → Rp${parsed.data.amount}` })
  revalidatePath('/tagihan')
  revalidatePath('/tunggakan')
  return { ok: true }
}

/**
 * Deletes bill(s) that have no payments recorded. Bills already paid (even
 * partially) are protected to preserve payment history integrity.
 */
export async function deleteBills(ids: string[]): Promise<BillActionResult & { deleted?: number }> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' }
  if (ids.length === 0) return { error: 'Pilih minimal satu tagihan.' }
  const { serviceClient } = ctx

  const { data: bills } = await serviceClient.from('bills').select('id, paid_amount, is_locked').in('id', ids)
  const rows = (bills ?? []) as { id: string; paid_amount: number; is_locked: boolean }[]
  const deletable = rows.filter((b) => Number(b.paid_amount) === 0 && !b.is_locked).map((b) => b.id)
  if (deletable.length === 0) return { error: 'Tagihan yang dipilih sudah ada pembayaran atau terkunci.' }

  const { error } = await serviceClient.from('bills').delete().in('id', deletable)
  if (error) return { error: error.message }

  await logAudit(serviceClient, ctx.user, { action: 'DELETE', entity: 'bill', detail: `Hapus ${deletable.length} tagihan` })
  revalidatePath('/tagihan')
  revalidatePath('/tunggakan')
  return { ok: true, deleted: deletable.length }
}

export async function togglePeriodLock(month: number, periodYear: number, lock: boolean): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'manageMasterData')) return { error: 'Tidak memiliki akses.' }
  const { serviceClient } = ctx
  const year = await getActiveYear(serviceClient)
  if (!year) return { error: 'Tidak ada tahun ajaran aktif.' }

  const { error } = await serviceClient
    .from('bills')
    .update({ is_locked: lock })
    .eq('academic_year_id', year.id)
    .eq('period_month', month)
    .eq('period_year', periodYear)
  if (error) return { error: error.message }

  await logAudit(serviceClient, ctx.user, {
    action: lock ? 'LOCK_PERIOD' : 'UNLOCK_PERIOD',
    entity: 'bill',
    detail: `Periode ${month}/${periodYear}`,
  })
  revalidatePath('/tagihan')
  return { ok: true }
}
