import type { Metadata } from 'next'
import { Download, CheckCircle2 } from 'lucide-react'
import { requireRole, can } from '@/lib/auth-guard'
import { fetchArrears } from '@/lib/queries'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PdfExportButton } from '@/components/ui/pdf-export-button'
import { TunggakanTable } from './tunggakan-table'
import { getSchoolSettings } from '@/lib/school'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Tunggakan' }

export default async function TunggakanPage() {
  const { user, serviceClient } = await requireRole(['ADMIN', 'BENDAHARA', 'KEPALA_SEKOLAH'])
  const isAdmin = can(user.role, 'manageMasterData')
  const [rows, schoolSettings] = await Promise.all([fetchArrears(serviceClient), getSchoolSettings(serviceClient)])
  const total = rows.reduce((s, r) => s + r.amount, 0)

  const pdfRows = rows.map((r) => [r.nis, r.full_name, r.class_name, r.major_code, r.months, formatCurrency(r.amount)])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tunggakan SPP"
        description={`${rows.length} siswa menunggak · Total ${formatCurrency(total)}`}
        actions={
          <>
            <a href="/api/tunggakan/export" className="btn btn-secondary btn-sm"><Download size={16} /> Export Excel</a>
            <PdfExportButton
              title="Laporan Tunggakan SPP"
              subtitle={`${schoolSettings.school_name} · Total tunggakan ${formatCurrency(total)}`}
              columns={['NIS', 'Nama', 'Kelas', 'Jurusan', 'Tagihan', 'Tunggakan']}
              rows={pdfRows}
              filename="laporan-tunggakan.pdf"
            />
          </>
        }
      />

      <div className="clay overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Tidak ada tunggakan" description="Seluruh tagihan SPP siswa aktif sudah lunas." />
        ) : (
          <TunggakanTable rows={rows} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  )
}
