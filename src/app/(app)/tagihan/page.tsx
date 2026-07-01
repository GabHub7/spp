import type { Metadata } from 'next'
import { FileText } from 'lucide-react'
import { requireRole, can } from '@/lib/auth-guard'
import { getActiveYear } from '@/lib/queries'
import { academicPeriods, academicYearStart, monthName, formatCurrency, BILL_TYPE_LABEL } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { GenerateBillsButton } from './generate-button'
import { CustomBillButton } from './custom-bill-button'
import { TagihanFilters } from './tagihan-filters'
import { TagihanTable, type BillRow } from './tagihan-table'
import type { SchoolClass } from '@/types'

export const metadata: Metadata = { title: 'Tagihan' }

export default async function TagihanPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; status?: string; jenis?: string; q?: string; all?: string }>
}) {
  const { user, serviceClient } = await requireRole(['ADMIN', 'BENDAHARA'])
  const sp = await searchParams
  const year = await getActiveYear(serviceClient)

  if (!year) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Tagihan" />
        <div className="clay">
          <EmptyState icon={FileText} title="Belum ada tahun ajaran aktif" description="Aktifkan tahun ajaran terlebih dahulu di menu Tahun Ajaran." />
        </div>
      </div>
    )
  }

  const periods = academicPeriods(academicYearStart(year.name))
  const isAdmin = can(user.role, 'manageMasterData')

  // "all=1" (set by the Tunggakan "Kelola" link) shows every bill type/period
  // for the searched student instead of the usual single-period/single-type
  // view — otherwise a student's March arrears would be invisible while
  // browsing July's SPP list.
  const showAll = sp.all === '1'

  const now = new Date()
  const defaultPeriod =
    periods.find((p) => p.month === now.getMonth() + 1 && p.year === now.getFullYear()) ?? periods[0]
  const month = sp.month ? Number(sp.month) : defaultPeriod.month
  const periodYear = sp.year ? Number(sp.year) : defaultPeriod.year
  const status = sp.status ?? ''
  const jenis = sp.jenis ?? 'SPP'
  const q = (sp.q ?? '').trim().toLowerCase()

  let query = serviceClient
    .from('bills')
    .select('id, period_month, period_year, amount, paid_amount, bill_type, title, status, is_locked, students(nis, full_name, classes(name))')
    .eq('academic_year_id', year.id)
    .order('status')
    .limit(5000)
  if (!showAll) {
    query = query.eq('bill_type', jenis)
    if (jenis === 'SPP') query = query.eq('period_month', month).eq('period_year', periodYear)
  }
  if (status) query = query.eq('status', status)

  const [{ data }, classesRes] = await Promise.all([
    query,
    isAdmin
      ? serviceClient.from('classes').select('id, name, grade, major_id').order('name')
      : Promise.resolve({ data: [] as unknown[] }),
  ])

  let rows = (data ?? []) as unknown as BillRow[]
  if (q) {
    rows = rows.filter(
      (r) => r.students?.full_name.toLowerCase().includes(q) || r.students?.nis.toLowerCase().includes(q)
    )
  }
  rows.sort((a, b) => (a.students?.full_name ?? '').localeCompare(b.students?.full_name ?? ''))

  const paidCount = rows.filter((r) => r.status === 'PAID').length
  const outstanding = rows.reduce((s, r) => s + Math.max(Number(r.amount) - Number(r.paid_amount), 0), 0)
  const periodLabel = showAll ? 'Semua Tagihan' : jenis === 'SPP' ? `${monthName(month)} ${periodYear}` : BILL_TYPE_LABEL[jenis] ?? jenis

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tagihan"
        description={`Tahun Ajaran ${year.name} · SPP otomatis per bulan + tagihan lain (Seragam, PTS, PAS, Daftar Ulang)`}
        actions={isAdmin ? (
          <>
            <CustomBillButton classes={(classesRes.data ?? []) as unknown as SchoolClass[]} />
            <GenerateBillsButton />
          </>
        ) : undefined}
      />

      {showAll ? (
        <div className="clay-pressed px-4 py-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Menampilkan seluruh tagihan (semua jenis & periode) untuk pencarian &quot;{sp.q}&quot;. Ubah filter di bawah untuk kembali ke tampilan per periode.
        </div>
      ) : null}
      <TagihanFilters periods={periods} month={month} periodYear={periodYear} status={status} jenis={jenis} q={sp.q ?? ''} />

      <div className="grid grid-cols-3 gap-4">
        <div className="clay p-4">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{showAll ? 'Cakupan' : jenis === 'SPP' ? 'Periode' : 'Jenis'}</p>
          <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{periodLabel}</p>
        </div>
        <div className="clay p-4">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Lunas / Total</p>
          <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{paidCount} / {rows.length}</p>
        </div>
        <div className="clay p-4">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Sisa Tagihan</p>
          <p className="text-lg font-bold mt-1" style={{ color: 'var(--accent)' }}>{formatCurrency(outstanding)}</p>
        </div>
      </div>

      <TagihanTable
        rows={rows}
        canManage={isAdmin}
        emptyDescription={jenis === 'SPP' ? 'Belum ada tagihan SPP untuk periode ini. Klik Generate Tagihan untuk membuatnya.' : 'Belum ada tagihan jenis ini. Klik Tagihan Lain untuk membuatnya.'}
      />
    </div>
  )
}
