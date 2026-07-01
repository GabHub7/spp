import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-guard'
import { fetchYearlyBreakdown } from '@/lib/queries'
import { rowsToXlsx, xlsxHeaders } from '@/lib/excel'

export async function GET(req: Request) {
  const ctx = await getSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const year = Number(url.searchParams.get('year')) || new Date().getFullYear()
  const breakdown = await fetchYearlyBreakdown(ctx.serviceClient, year)

  const data = breakdown.map((r) => ({
    Bulan: r.label,
    'Jumlah Transaksi': r.count,
    'Total Pembayaran': r.total,
  }))
  data.push({
    Bulan: 'TOTAL',
    'Jumlah Transaksi': breakdown.reduce((s, r) => s + r.count, 0),
    'Total Pembayaran': breakdown.reduce((s, r) => s + r.total, 0),
  })

  const buffer = rowsToXlsx(data, `Laporan ${year}`)
  return new NextResponse(new Uint8Array(buffer), {
    headers: xlsxHeaders(`laporan-spp-${year}.xlsx`),
  })
}
