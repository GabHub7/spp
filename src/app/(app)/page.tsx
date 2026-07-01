import type { Metadata } from 'next'
import Link from 'next/link'
import { Users, Wallet, CalendarRange, AlertTriangle, FileText, TrendingUp, BadgeCheck } from 'lucide-react'
import { getSession } from '@/lib/auth-guard'
import { getActiveYear, getDashboardStats } from '@/lib/queries'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { PaymentChart } from './payment-chart'
import { formatCurrency, formatNumber, ROLE_LABEL } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const ctx = await getSession()
  if (!ctx) return null
  const { user, serviceClient } = ctx

  const [year, stats] = await Promise.all([
    getActiveYear(serviceClient),
    getDashboardStats(serviceClient),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Selamat datang, ${user.fullName.split(' ')[0]}`}
        description={`Ringkasan pembayaran SPP${year ? ` · Tahun Ajaran ${year.name}` : ''} · ${ROLE_LABEL[user.role]}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Total Siswa Aktif" value={formatNumber(stats.totalStudents)} icon={Users} tone="red" />
        <StatCard label="Pembayaran Hari Ini" value={formatCurrency(stats.paidToday)} icon={Wallet} tone="green" />
        <StatCard label="Pembayaran Bulan Ini" value={formatCurrency(stats.paidThisMonth)} icon={CalendarRange} tone="orange" />
        <StatCard label="Total Tunggakan" value={formatCurrency(stats.arrearsAmount)} icon={AlertTriangle} tone="red" />
        <StatCard label="Tagihan Belum Bayar" value={formatNumber(stats.unpaidCount)} icon={FileText} tone="orange" hint="jumlah tagihan UNPAID" />
        <StatCard label="Persentase Lunas" value={`${stats.paidPercent}%`} icon={TrendingUp} tone="green" hint="dari total tagihan terbit" />
      </div>

      {stats.pendingVerifications > 0 && (user.role === 'ADMIN' || user.role === 'BENDAHARA') && (
        <Link href="/verifikasi" className="clay p-4 flex items-center gap-3 hover-lift" style={{ borderColor: 'var(--accent-2)' }}>
          <div className="grid place-items-center w-11 h-11 rounded-[14px] shrink-0" style={{ background: 'var(--accent-2-light)', color: 'var(--accent-2)' }}>
            <BadgeCheck size={20} />
          </div>
          <div className="flex-1">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {stats.pendingVerifications} pembayaran online menunggu verifikasi
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Klik untuk meninjau bukti pembayaran orang tua</p>
          </div>
        </Link>
      )}

      <div className="clay p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Grafik Pembayaran {new Date().getFullYear()}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Total nominal pembayaran SPP per bulan
            </p>
          </div>
        </div>
        <PaymentChart data={stats.monthly} />
      </div>
    </div>
  )
}
