'use server'

import { revalidatePath } from 'next/cache'
import { getSession, can } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

export interface ActionResult { ok?: boolean; error?: string }

/**
 * Staff verification of an online (transfer/QRIS) payment submitted by a
 * parent. Approve → payment SUCCESS + bill PAID. Reject → payment CANCELLED
 * (the bill returns to UNPAID so the parent can resubmit).
 */
export async function reviewPayment(paymentId: string, approve: boolean): Promise<ActionResult> {
  const ctx = await getSession()
  if (!ctx) return { error: 'Sesi berakhir.' }
  if (!can(ctx.user.role, 'managePayments')) return { error: 'Tidak memiliki akses verifikasi.' }
  const { serviceClient, user } = ctx

  const { data: payment } = await serviceClient
    .from('payments')
    .select('id, bill_id, status, amount')
    .eq('id', paymentId)
    .maybeSingle()
  if (!payment) return { error: 'Pembayaran tidak ditemukan.' }
  if (payment.status !== 'PENDING') return { error: 'Pembayaran sudah diproses.' }

  if (approve) {
    const { error } = await serviceClient
      .from('payments')
      .update({
        status: 'SUCCESS',
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        officer_name: user.fullName,
        officer_id: user.id,
      })
      .eq('id', paymentId)
    if (error) return { error: error.message }

    // Credit the bill by the verified amount; mark PAID once fully covered.
    const { data: bill } = await serviceClient
      .from('bills')
      .select('amount, paid_amount')
      .eq('id', payment.bill_id)
      .maybeSingle()
    const billAmount = Number((bill as { amount: number } | null)?.amount ?? 0)
    const newPaid = Number((bill as { paid_amount: number } | null)?.paid_amount ?? 0) + Number(payment.amount)
    await serviceClient
      .from('bills')
      .update({ status: newPaid >= billAmount ? 'PAID' : 'PARTIAL', paid_amount: newPaid })
      .eq('id', payment.bill_id)
  } else {
    const { error } = await serviceClient
      .from('payments')
      .update({ status: 'CANCELLED', verified_by: user.id, verified_at: new Date().toISOString() })
      .eq('id', paymentId)
    if (error) return { error: error.message }
  }

  await logAudit(serviceClient, user, {
    action: approve ? 'VERIFY_PAYMENT' : 'REJECT_PAYMENT',
    entity: 'payment',
    entityId: paymentId,
    detail: approve ? 'Verifikasi pembayaran online' : 'Tolak pembayaran online',
  })
  revalidatePath('/verifikasi')
  revalidatePath('/pembayaran')
  revalidatePath('/tagihan')
  return { ok: true }
}
