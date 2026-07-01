import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth-guard'
import { Receipt } from '@/components/app/receipt'
import { PrintActions } from './print-button'
import { getSchoolSettings } from '@/lib/school'
import { formatDateTime, billLabel, BILL_TYPE_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/utils'

export const metadata: Metadata = { title: 'Bukti Pembayaran' }

interface PaymentDetail {
  status: string
  transaction_no: string
  amount: number
  method: string
  is_installment: boolean
  paid_at: string
  officer_name: string | null
  note: string | null
  students: { nis: string; full_name: string; parent_user_id: string | null; classes: { name: string } | null } | null
  bills: { period_month: number; period_year: number; bill_type: string | null; title: string | null } | null
}

export default async function PortalStrukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getSession()
  if (!ctx) return null
  const { user, serviceClient } = ctx

  const { data } = await serviceClient
    .from('payments')
    .select('status, transaction_no, amount, method, is_installment, paid_at, officer_name, note, students(nis, full_name, parent_user_id, classes(name)), bills(period_month, period_year, bill_type, title)')
    .eq('id', id)
    .maybeSingle()

  if (!data) notFound()
  const p = data as unknown as PaymentDetail
  // Authorize: the payment must belong to this parent's child and be verified.
  if (!p.students || p.students.parent_user_id !== user.id || p.status !== 'SUCCESS') notFound()

  const schoolSettings = await getSchoolSettings(serviceClient)
  const billType = p.bills?.bill_type ?? 'SPP'

  const rows: [string, string][] = [
    ['No. Transaksi', p.transaction_no],
    ['Tanggal', formatDateTime(p.paid_at)],
    ['NIS', p.students?.nis ?? '—'],
    ['Nama', p.students?.full_name ?? '—'],
    ['Kelas', p.students?.classes?.name ?? '—'],
    ['Jenis', BILL_TYPE_LABEL[billType] ?? billType],
    ['Untuk', p.bills ? billLabel(p.bills) : '—'],
    ['Metode', PAYMENT_METHOD_LABEL[p.method] ?? p.method],
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex items-center justify-between">
        <h1 className="section-title">Bukti Pembayaran</h1>
        <PrintActions />
      </div>

      <Receipt
        schoolName={schoolSettings.school_name}
        logoUrl={schoolSettings.logo_url}
        amount={Number(p.amount)}
        statusLabel={p.is_installment ? 'CICILAN' : 'LUNAS'}
        rows={rows}
        note={p.note}
      />
    </div>
  )
}
