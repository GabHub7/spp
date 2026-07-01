import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-guard'
import { fetchPaymentHistory } from '@/lib/queries'
import { rowsToXlsx, xlsxHeaders } from '@/lib/excel'
import { formatDateTime, PAYMENT_METHOD_LABEL } from '@/lib/utils'

export async function GET(req: Request) {
  const ctx = await getSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const rows = await fetchPaymentHistory(ctx.serviceClient, {
    q: url.searchParams.get('q') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    method: url.searchParams.get('method') ?? undefined,
  })

  const data = rows.map((r) => ({
    'No. Transaksi': r.transaction_no,
    NIS: r.nis,
    Nama: r.full_name,
    Kelas: r.class_name,
    Keterangan: r.period,
    Metode: PAYMENT_METHOD_LABEL[r.method] ?? r.method,
    Status: r.is_installment ? 'Cicilan' : 'Lunas',
    Nominal: r.amount,
    Tanggal: formatDateTime(r.paid_at),
    Petugas: r.officer_name ?? '',
  }))

  const buffer = rowsToXlsx(data.length ? data : [{ Info: 'Tidak ada data' }], 'Riwayat Pembayaran')
  return new NextResponse(new Uint8Array(buffer), {
    headers: xlsxHeaders(`riwayat-pembayaran-${new Date().toISOString().slice(0, 10)}.xlsx`),
  })
}
