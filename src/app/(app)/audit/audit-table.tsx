'use client'

import { useState } from 'react'
import { Pagination } from '@/components/ui/pagination'
import { formatDateTime, ROLE_LABEL } from '@/lib/utils'
import type { AuditLog } from '@/types'

export function AuditTable({ logs }: { logs: AuditLog[] }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = logs.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Waktu</th><th>Pengguna</th><th>Role</th><th>Aksi</th><th>Entitas</th><th>Detail</th><th>IP</th></tr>
          </thead>
          <tbody>
            {pageRows.map((l) => (
              <tr key={l.id}>
                <td className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatDateTime(l.created_at)}</td>
                <td className="font-semibold">{l.username ?? '—'}</td>
                <td className="text-xs">{l.role ? (ROLE_LABEL[l.role] ?? l.role) : '—'}</td>
                <td><span className="badge status-info">{l.action}</span></td>
                <td className="text-xs">{l.entity ?? '—'}</td>
                <td className="text-xs max-w-xs truncate" title={l.detail ?? ''}>{l.detail ?? '—'}</td>
                <td className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{l.ip_address ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={safePage}
        pageSize={pageSize}
        total={logs.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1) }}
      />
    </>
  )
}
