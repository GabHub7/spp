'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

const PAGE_SIZES = [25, 50, 100, 200]

/** Client-side pagination bar — keeps long lists from becoming an unscrollable wall of rows. */
export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  if (total === 0) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Menampilkan <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{from}–{to}</span> dari {total}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="select"
            style={{ minHeight: '2.25rem', padding: '0.375rem 0.75rem', fontSize: '0.8125rem', width: 'auto' }}
          >
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / halaman</option>)}
          </select>
        )}
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="btn btn-ghost btn-sm"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="btn btn-ghost btn-sm"
          aria-label="Halaman berikutnya"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
