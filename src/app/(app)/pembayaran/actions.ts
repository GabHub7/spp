'use server'

import { revalidatePath } from 'next/cache'
import { getSession, can } from '@/lib/auth-guard'
import { getActiveYear } from '@/lib/queries'
import { generateTransactionNo, billLabel } from '@/lib/utils'
import { logAudit } from '@/lib/audit'
import type { SupabaseServiceClient } from '@/lib/supabase/server'
import type { PaymentMethod } from '@/types'

export interface StudentMatch {
  id: string
  nis: string
  full_name: string
  class_name: string | null
}

export interface UnpaidBill {
  id: string
  period_month: number
  period_year: number
  bill_type: string
  title: string | null
  label: string
  amount: number
  paid_amount: number
  remaining: number
  status: string
  is_locked: boolean
}

export async function searchStudents(q: string): Promise<StudentMatch[]> {
  const ctx = await getSession()
  if (!ctx) return []
  const term = q.trim()
  if (term.length < 1) return []

  const { data } = await ctx.serviceClient
    .from('students')
    .select('id, nis, full_name, status, classes(name)')
    .eq('status', 'ACTIVE')
    .or(`nis.ilike.%${term}%,full_name.ilike.%${term}%`)
    .order('full_name')
    .limit(10)

  return ((data ?? []) as unknown as { id: string; nis: string; full_name: string; classes: { name: string } | null }[]).map((s) => ({
    id: s.id,
    nis: s.nis,
    full_name: s.full_name,
    class_name: s.classes?.name ?? null,
  }))
}

export async function getStudentBills(studentId: string): Promise<UnpaidBill[]> {
  const ctx = await getSession()
  if (!ctx) return []
  const year = await getActiveYear(ctx.serviceClient)
  if (!year) return []

  const { data } = await ctx.serviceClient
    .from('bills')
    .select('id, period_month, period_year, amount, paid_amount, bill_type, title, status, is_locked')
    .eq('student_id', studentId)
    .eq('academic_year_id', year.id)
    .in('status', ['UNPAID', 'PARTIAL'])
    .order('bill_type')
    .order('period_year')
    .order('period_month')

  return ((data ?? []) as {
    id: string; period_month: number; period_year: number; amount: number
    paid_amount: number; bill_type: string | null; title: string | null; status: string; is_locked: boolean
  }[]).map((b) => {
    const amount = Number(b.amount)
    const paid = Number(b.paid_amount)
    return {
      id: b.id,
      period_month: b.period_month,
      period_year: b.period_year,
      bill_type: b.bill_type ?? 'SPP',
      title: b.title,
      label: billLabel(b),
      amount,
      paid_amount: paid,
      remaining: Math.max(amount - paid, 0),
      status: b.status,
      is_locked: b.is_locked,
    }
  })
}

export interface PayResult {
  ok?: boolean
  error?: string
  firstPaymentId?: string
  count?: number
}

async function seedSequence(serviceClient: SupabaseServiceClient): Promise<number> {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const { count } = await serviceClient
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startToday)
  return (count ?? 0) + 1
}

/**
 * Records a full ("Lunas") payment for one or more bills of a student. Each
 * bill is settled for its remaining balance (amount − paid_amount), so this
 * also closes out any prior installments. Unique txn number SPP-YYYYMMDD-XXXX.
 */
export async function payBills(
  studentId: string,
  billIds: string[],
  method: PaymentMethod,
  note: string
): Promise<PayResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'managePayments')) return { error: 'Tidak memiliki akses pembayaran.' }
  if (billIds.length === 0) return { error: 'Pilih minimal satu tagihan.' }

  const { serviceClient, user } = ctx

  const { data: bills } = await serviceClient
    .from('bills')
    .select('id, student_id, amount, paid_amount, status, is_locked')
    .in('id', billIds)

  const valid = (bills ?? []) as { id: string; student_id: string; amount: number; paid_amount: number; status: string; is_locked: boolean }[]
  if (valid.length === 0) return { error: 'Tagihan tidak ditemukan.' }
  if (valid.some((b) => b.student_id !== studentId)) return { error: 'Tagihan tidak sesuai siswa.' }
  if (valid.some((b) => b.status === 'PAID')) return { error: 'Sebagian tagihan sudah lunas.' }
  if (valid.some((b) => b.is_locked)) return { error: 'Sebagian tagihan terkunci dan tidak dapat dibayar.' }

  let seq = await seedSequence(serviceClient)
  let firstPaymentId: string | undefined

  for (const bill of valid) {
    const remaining = Math.max(Number(bill.amount) - Number(bill.paid_amount), 0)
    if (remaining <= 0) continue

    let inserted = null
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const txn = generateTransactionNo(seq)
      const { data, error } = await serviceClient
        .from('payments')
        .insert({
          transaction_no: txn,
          bill_id: bill.id,
          student_id: studentId,
          amount: remaining,
          method,
          status: 'SUCCESS',
          is_installment: false,
          officer_id: user.id,
          officer_name: user.fullName,
          note: note || null,
        })
        .select('id')
        .single()
      seq++
      if (!error && data) inserted = data
      else if (error && !error.message.includes('duplicate')) return { error: error.message }
    }
    if (!inserted) return { error: 'Gagal membuat nomor transaksi unik.' }

    await serviceClient.from('bills').update({ status: 'PAID', paid_amount: Number(bill.amount) }).eq('id', bill.id)
    if (!firstPaymentId) firstPaymentId = inserted.id
  }

  await logAudit(serviceClient, user, {
    action: 'PAYMENT',
    entity: 'payment',
    entityId: firstPaymentId,
    detail: `Pembayaran ${valid.length} tagihan (${method})`,
  })

  revalidatePath('/pembayaran')
  revalidatePath('/tagihan')
  return { ok: true, firstPaymentId, count: valid.length }
}

/**
 * Records a partial ("Cicil") payment of `amount` against a single bill. The
 * bill becomes PARTIAL until cumulative payments reach its full amount, then
 * PAID. The over-payment guard keeps a cicil ≤ the remaining balance.
 */
export async function payInstallment(
  studentId: string,
  billId: string,
  amount: number,
  method: PaymentMethod,
  note: string
): Promise<PayResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'managePayments')) return { error: 'Tidak memiliki akses pembayaran.' }
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Nominal cicilan harus lebih dari 0.' }

  const { serviceClient, user } = ctx

  const { data: bill } = await serviceClient
    .from('bills')
    .select('id, student_id, amount, paid_amount, status, is_locked')
    .eq('id', billId)
    .maybeSingle()
  const b = bill as { id: string; student_id: string; amount: number; paid_amount: number; status: string; is_locked: boolean } | null
  if (!b) return { error: 'Tagihan tidak ditemukan.' }
  if (b.student_id !== studentId) return { error: 'Tagihan tidak sesuai siswa.' }
  if (b.status === 'PAID') return { error: 'Tagihan sudah lunas.' }
  if (b.is_locked) return { error: 'Tagihan terkunci dan tidak dapat dibayar.' }

  const billAmount = Number(b.amount)
  const remaining = Math.max(billAmount - Number(b.paid_amount), 0)
  const pay = Math.round(amount)
  if (pay > remaining) return { error: `Cicilan melebihi sisa tagihan (${remaining}).` }

  const newPaid = Number(b.paid_amount) + pay
  const newStatus = newPaid >= billAmount ? 'PAID' : 'PARTIAL'

  let seq = await seedSequence(serviceClient)
  let inserted = null
  for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
    const txn = generateTransactionNo(seq)
    const { data, error } = await serviceClient
      .from('payments')
      .insert({
        transaction_no: txn,
        bill_id: b.id,
        student_id: studentId,
        amount: pay,
        method,
        status: 'SUCCESS',
        is_installment: true,
        officer_id: user.id,
        officer_name: user.fullName,
        note: note || null,
      })
      .select('id')
      .single()
    seq++
    if (!error && data) inserted = data
    else if (error && !error.message.includes('duplicate')) return { error: error.message }
  }
  if (!inserted) return { error: 'Gagal membuat nomor transaksi unik.' }

  await serviceClient.from('bills').update({ status: newStatus, paid_amount: newPaid }).eq('id', b.id)

  await logAudit(serviceClient, user, {
    action: 'PAYMENT_INSTALLMENT',
    entity: 'payment',
    entityId: inserted.id,
    detail: `Cicilan Rp${pay} (${method}) — ${newStatus === 'PAID' ? 'lunas' : 'belum lunas'}`,
  })

  revalidatePath('/pembayaran')
  revalidatePath('/tagihan')
  return { ok: true, firstPaymentId: inserted.id, count: 1 }
}
