'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Settings2 } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { ArrearRow } from '@/lib/queries'

export function TunggakanTable({ rows, isAdmin }: { rows: ArrearRow[]; isAdmin: boolean }) {
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
            <tr><th>NIS</th><th>Nama Siswa</th><th>Kelas</th><th>Jurusan</th><th>Tagihan</th><th>Total Tunggakan</th><th>Rincian</th>{isAdmin && <th className="text-right">Aksi</th>}</tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.student_id}>
                <td className="font-mono text-xs" data-label="NIS">{r.nis}</td>
                <td className="font-semibold" data-label="Nama">{r.full_name}</td>
                <td data-label="Kelas">{r.class_name || '—'}</td>
                <td data-label="Jurusan">{r.major_code || '—'}</td>
                <td data-label="Tagihan">
                  <span className="badge status-warning"><AlertTriangle size={12} /> {formatNumber(r.months)} tagihan</span>
                </td>
                <td className="font-bold" style={{ color: 'var(--accent)' }} data-label="Total Tunggakan">{formatCurrency(r.amount)}</td>
                <td className="text-xs max-w-xs truncate" style={{ color: 'var(--text-muted)' }} title={r.periods} data-label="Rincian">{r.periods}</td>
                {isAdmin && (
                  <td className="text-right cell-actions" data-label="Aksi">
                    <Link href={`/tagihan?q=${encodeURIComponent(r.nis)}&all=1`} className="btn btn-ghost btn-sm">
                      <Settings2 size={14} /> Kelola
                    </Link>
                  </td>
                )}
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
