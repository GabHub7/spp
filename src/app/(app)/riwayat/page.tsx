import type { Metadata } from 'next'
import { History, Download } from 'lucide-react'
import { requireRole } from '@/lib/auth-guard'
import { fetchPaymentHistory } from '@/lib/queries'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PdfExportButton } from '@/components/ui/pdf-export-button'
import { RiwayatFilters } from './riwayat-filters'
import { RiwayatTable } from './riwayat-table'
import { getSchoolSettings } from '@/lib/school'
import { formatCurrency, PAYMENT_METHOD_LABEL, formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Riwayat Pembayaran' }

export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; method?: string }>
}) {
  const { serviceClient } = await requireRole(['ADMIN', 'BENDAHARA'])
  const sp = await searchParams
  const [rows, schoolSettings] = await Promise.all([fetchPaymentHistory(serviceClient, sp), getSchoolSettings(serviceClient)])

  const total = rows.reduce((s, r) => s + r.amount, 0)
  const exportQs = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v) as [string, string][]
  ).toString()

  const pdfRows = rows.map((r) => [
    r.transaction_no, r.nis, r.full_name, r.class_name, r.period,
    PAYMENT_METHOD_LABEL[r.method] ?? r.method, r.is_installment ? 'Cicilan' : 'Lunas',
    formatCurrency(r.amount), formatDateTime(r.paid_at),
  ])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Riwayat Pembayaran"
        description={`${rows.length} transaksi · Total ${formatCurrency(total)}`}
        actions={
          <>
            <a href={`/api/riwayat/export?${exportQs}`} className="btn btn-secondary btn-sm">
              <Download size={16} /> Export Excel
            </a>
            <PdfExportButton
              title="Riwayat Pembayaran SPP"
              subtitle={`${schoolSettings.school_name} · Total ${formatCurrency(total)}`}
              columns={['No. Transaksi', 'NIS', 'Nama', 'Kelas', 'Keterangan', 'Metode', 'Status', 'Nominal', 'Tanggal']}
              rows={pdfRows}
              filename="riwayat-pembayaran.pdf"
            />
          </>
        }
      />

      <RiwayatFilters q={sp.q ?? ''} from={sp.from ?? ''} to={sp.to ?? ''} method={sp.method ?? ''} />

      <div className="clay overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={History} title="Belum ada pembayaran" description="Tidak ada transaksi yang cocok dengan filter." />
        ) : (
          <RiwayatTable rows={rows} />
        )}
      </div>
    </div>
  )
}
