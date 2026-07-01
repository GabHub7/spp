import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth-guard'
import { PembayaranClient } from './pembayaran-client'
import type { PaymentSettings } from '@/types'

export const metadata: Metadata = { title: 'Pembayaran' }

interface RecentPayment {
  id: string
  transaction_no: string
  amount: number
  method: string
  is_installment: boolean
  paid_at: string
  officer_name: string | null
  students: { nis: string; full_name: string } | null
  bills: { period_month: number; period_year: number; bill_type: string | null; title: string | null; status: string } | null
}

export default async function PembayaranPage() {
  const { serviceClient } = await requireRole(['ADMIN', 'BENDAHARA'])

  const [recentRes, settingsRes] = await Promise.all([
    serviceClient
      .from('payments')
      .select('id, transaction_no, amount, method, is_installment, paid_at, officer_name, students(nis, full_name), bills(period_month, period_year, bill_type, title, status)')
      .eq('is_deleted', false)
      .eq('status', 'SUCCESS')
      .order('paid_at', { ascending: false })
      .limit(15),
    serviceClient.from('payment_settings').select('*').eq('id', 1).maybeSingle(),
  ])

  return (
    <PembayaranClient
      recent={(recentRes.data ?? []) as unknown as RecentPayment[]}
      settings={(settingsRes.data ?? null) as PaymentSettings | null}
    />
  )
}
