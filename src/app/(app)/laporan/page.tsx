import type { Metadata } from 'next'
import { Wallet, CalendarRange, TrendingUp, AlertTriangle, Download } from 'lucide-react'
import { requireRole } from '@/lib/auth-guard'
import { getDashboardStats, getActiveYear, fetchYearlyBreakdown } from '@/lib/queries'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { PdfExportButton } from '@/components/ui/pdf-export-button'
import { getSchoolSettings } from '@/lib/school'
import { formatCurrency, formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Laporan' }

export default async function LaporanPage() {
  const { serviceClient } = await requireRole(['ADMIN', 'BENDAHARA', 'KEPALA_SEKOLAH'])
  const calendarYear = new Date().getFullYear()

  const [stats, year, breakdown, schoolSettings] = await Promise.all([
    getDashboardStats(serviceClient),
    getActiveYear(serviceClient),
    fetchYearlyBreakdown(serviceClient, calendarYear),
    getSchoolSettings(serviceClient),
  ])

  const yearTotal = breakdown.reduce((s, r) => s + r.total, 0)
  const yearCount = breakdown.reduce((s, r) => s + r.count, 0)
  const pdfRows = breakdown.map((r) => [r.label, formatNumber(r.count), formatCurrency(r.total)])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Laporan Keuangan SPP"
        description={`Tahun Ajaran ${year?.name ?? '—'} · Rekap pembayaran dan tunggakan`}
        actions={
          <>
            <a href={`/api/laporan/export?year=${calendarYear}`} className="btn btn-secondary btn-sm"><Download size={16} /> Export Excel</a>
            <PdfExportButton
              title={`Laporan Pembayaran SPP ${calendarYear}`}
              subtitle={`${schoolSettings.school_name} · Total ${formatCurrency(yearTotal)} dari ${formatNumber(yearCount)} transaksi`}
              columns={['Bulan', 'Jumlah Transaksi', 'Total']}
              rows={pdfRows}
              filename={`laporan-spp-${calendarYear}.pdf`}
            />
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Pembayaran Hari Ini" value={formatCurrency(stats.paidToday)} icon={Wallet} tone="green" />
        <StatCard label="Pembayaran Bulan Ini" value={formatCurrency(stats.paidThisMonth)} icon={CalendarRange} tone="orange" />
        <StatCard label={`Total Tahun ${calendarYear}`} value={formatCurrency(yearTotal)} icon={TrendingUp} tone="red" hint={`${formatNumber(yearCount)} transaksi`} />
        <StatCard label="Total Tunggakan" value={formatCurrency(stats.arrearsAmount)} icon={AlertTriangle} tone="red" hint={`${formatNumber(stats.unpaidCount)} tagihan`} />
      </div>

      <div className="clay overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Rekap Bulanan {calendarYear}</h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Laporan tahunan per bulan</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Bulan</th><th>Jumlah Transaksi</th><th className="text-right">Total Pembayaran</th></tr></thead>
            <tbody>
              {breakdown.map((r) => (
                <tr key={r.month}>
                  <td className="font-semibold">{r.label}</td>
                  <td>{formatNumber(r.count)}</td>
                  <td className="text-right font-semibold">{formatCurrency(r.total)}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--bg-tertiary)' }}>
                <td className="font-bold">Total</td>
                <td className="font-bold">{formatNumber(yearCount)}</td>
                <td className="text-right font-extrabold" style={{ color: 'var(--accent)' }}>{formatCurrency(yearTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
