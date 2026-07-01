import type { Metadata } from 'next'
import Link from 'next/link'
import { History, Clock, CheckCircle2, XCircle, Printer } from 'lucide-react'
import { getSession } from '@/lib/auth-guard'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDateTime, billLabel, PAYMENT_METHOD_LABEL, isDisplayedAsInstallment } from '@/lib/utils'

export const metadata: Metadata = { title: 'Riwayat Pembayaran' }

interface Row {
  id: string
  transaction_no: string
  amount: number
  method: string
  status: string
  paid_at: string
  created_at: string
  is_installment: boolean
  students: { full_name: string } | null
  bills: { period_month: number; period_year: number; bill_type: string | null; title: string | null; status: string } | null
}

const STATUS: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  PENDING: { label: 'Menunggu Verifikasi', cls: 'status-info', icon: Clock },
  SUCCESS: { label: 'Berhasil', cls: 'status-success', icon: CheckCircle2 },
  CANCELLED: { label: 'Ditolak', cls: 'status-error', icon: XCircle },
  FAILED: { label: 'Gagal', cls: 'status-error', icon: XCircle },
}

export default async function PortalRiwayatPage() {
  const ctx = await getSession()
  if (!ctx) return null
  const { user, serviceClient } = ctx

  const { data: kids } = await serviceClient.from('students').select('id').eq('parent_user_id', user.id)
  const ids = (kids ?? []).map((k) => (k as { id: string }).id)

  let rows: Row[] = []
  if (ids.length > 0) {
    const { data } = await serviceClient
      .from('payments')
      .select('id, transaction_no, amount, method, status, is_installment, paid_at, created_at, students(full_name), bills(period_month, period_year, bill_type, title, status)')
      .in('student_id', ids)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(200)
    rows = (data ?? []) as unknown as Row[]
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="section-title">Riwayat Pembayaran</h1>
        <p className="section-subtitle mt-1">Status pengajuan dan pembayaran SPP Anda</p>
      </div>

      {rows.length === 0 ? (
        <div className="clay">
          <EmptyState icon={History} title="Belum ada pembayaran" description="Pengajuan pembayaran Anda akan muncul di sini." />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const st = STATUS[r.status] ?? STATUS.PENDING
            const Icon = st.icon
            return (
              <div key={r.id} className="clay p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {r.bills ? billLabel(r.bills) : 'Pembayaran'}
                      {isDisplayedAsInstallment(r, r.bills) && <span className="badge status-info ml-1 align-middle">Cicil</span>}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {r.students?.full_name} · {PAYMENT_METHOD_LABEL[r.method] ?? r.method}
                    </p>
                    <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{r.transaction_no}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(r.amount))}</p>
                    <span className={`badge ${st.cls} mt-1`}><Icon size={11} /> {st.label}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(r.created_at)}</span>
                  {r.status === 'SUCCESS' && (
                    <Link href={`/portal/struk/${r.id}`} className="btn btn-ghost btn-sm"><Printer size={14} /> Bukti</Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
