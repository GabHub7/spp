import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth-guard'
import { Receipt } from '@/components/app/receipt'
import { PrintActions } from './print-button'
import { getSchoolSettings } from '@/lib/school'
import { formatCurrency, formatDateTime, billLabel, BILL_TYPE_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/utils'

export const metadata: Metadata = { title: 'Bukti Pembayaran' }

interface PaymentDetail {
  transaction_no: string
  amount: number
  method: string
  is_installment: boolean
  paid_at: string
  officer_name: string | null
  note: string | null
  students: { nis: string; full_name: string; classes: { name: string } | null } | null
  bills: { period_month: number; period_year: number; bill_type: string | null; title: string | null; amount: number; paid_amount: number } | null
}

export default async function StrukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { serviceClient } = await requireRole(['ADMIN', 'BENDAHARA'])

  const { data } = await serviceClient
    .from('payments')
    .select('transaction_no, amount, method, is_installment, paid_at, officer_name, note, students(nis, full_name, classes(name)), bills(period_month, period_year, bill_type, title, amount, paid_amount)')
    .eq('id', id)
    .maybeSingle()

  if (!data) notFound()
  const p = data as unknown as PaymentDetail

  const [{ data: paymentSettings }, schoolSettings] = await Promise.all([
    serviceClient.from('payment_settings').select('bank_account_holder').eq('id', 1).maybeSingle(),
    getSchoolSettings(serviceClient),
  ])
  const schoolName = (paymentSettings as { bank_account_holder: string | null } | null)?.bank_account_holder || schoolSettings.school_name

  const billType = p.bills?.bill_type ?? 'SPP'
  const remaining = p.bills ? Number(p.bills.amount) - Number(p.bills.paid_amount) : 0
  const settled = remaining <= 0

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
  if (p.is_installment) {
    rows.push(['Pembayaran', 'Cicilan'])
    if (!settled) rows.push(['Sisa Tagihan', formatCurrency(remaining)])
  }
  rows.push(['Petugas', p.officer_name ?? '—'])

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-4">
      <div className="no-print flex items-center justify-between">
        <h1 className="section-title">Bukti Pembayaran</h1>
        <PrintActions />
      </div>

      <Receipt
        schoolName={schoolName}
        logoUrl={schoolSettings.logo_url}
        amount={Number(p.amount)}
        statusLabel={p.is_installment && !settled ? 'CICILAN' : 'LUNAS'}
        rows={rows}
        note={p.note}
      />
    </div>
  )
}
