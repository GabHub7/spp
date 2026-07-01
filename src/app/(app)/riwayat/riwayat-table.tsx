'use client'

import { useState } from 'react'
import { Pagination } from '@/components/ui/pagination'
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABEL } from '@/lib/utils'
import type { PaymentHistoryRow } from '@/lib/queries'

export function RiwayatTable({ rows }: { rows: PaymentHistoryRow[] }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="data-table data-cards">
          <thead>
            <tr><th>No. Transaksi</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Keterangan</th><th>Metode</th><th>Status</th><th>Nominal</th><th>Tanggal</th><th>Petugas</th></tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs" data-label="No. Transaksi">{r.transaction_no}</td>
                <td className="font-mono text-xs" data-label="NIS">{r.nis}</td>
                <td className="font-semibold" data-label="Nama">{r.full_name}</td>
                <td data-label="Kelas">{r.class_name || '—'}</td>
                <td data-label="Keterangan">{r.period || '—'}</td>
                <td data-label="Metode"><span className="badge status-neutral">{PAYMENT_METHOD_LABEL[r.method] ?? r.method}</span></td>
                <td data-label="Status">
                  <span className={`badge ${r.is_installment ? 'status-info' : 'status-success'}`}>{r.is_installment ? 'Cicilan' : 'Lunas'}</span>
                </td>
                <td className="font-semibold" data-label="Nominal">{formatCurrency(r.amount)}</td>
                <td className="text-xs" style={{ color: 'var(--text-muted)' }} data-label="Tanggal">{formatDateTime(r.paid_at)}</td>
                <td className="text-xs" data-label="Petugas">{r.officer_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={safePage}
        pageSize={pageSize}
        total={rows.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1) }}
      />
    </>
  )
}
