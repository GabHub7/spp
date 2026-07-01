import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth-guard'
import { VerifikasiClient } from './verifikasi-client'
import type { SchoolClass } from '@/types'

export const metadata: Metadata = { title: 'Verifikasi Pembayaran' }

export interface PendingPayment {
  id: string
  transaction_no: string
  amount: number
  method: string
  note: string | null
  proof_url: string | null
  created_at: string
  students: { nis: string; full_name: string; class_id: string | null; classes: { name: string } | null } | null
  bills: { period_month: number; period_year: number; bill_type: string | null; title: string | null } | null
}

export default async function VerifikasiPage() {
  const { serviceClient } = await requireRole(['ADMIN', 'BENDAHARA'])
  const [{ data }, { data: classes }] = await Promise.all([
    serviceClient
      .from('payments')
      .select('id, transaction_no, amount, method, note, proof_url, created_at, students(nis, full_name, class_id, classes(name)), bills(period_month, period_year, bill_type, title)')
      .eq('status', 'PENDING')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(500),
    serviceClient.from('classes').select('id, name, grade, major_id').order('name'),
  ])

  return (
    <VerifikasiClient
      payments={(data ?? []) as unknown as PendingPayment[]}
      classes={(classes ?? []) as SchoolClass[]}
    />
  )
}
