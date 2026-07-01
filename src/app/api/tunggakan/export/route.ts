import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-guard'
import { fetchArrears } from '@/lib/queries'
import { rowsToXlsx, xlsxHeaders } from '@/lib/excel'

export async function GET() {
  const ctx = await getSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await fetchArrears(ctx.serviceClient)
  const data = rows.map((r) => ({
    NIS: r.nis,
    Nama: r.full_name,
    Kelas: r.class_name,
    Jurusan: r.major_code,
    'Tagihan Menunggak': r.months,
    'Total Tunggakan': r.amount,
    Rincian: r.periods,
  }))

  const buffer = rowsToXlsx(data.length ? data : [{ Info: 'Tidak ada tunggakan' }], 'Tunggakan')
  return new NextResponse(new Uint8Array(buffer), {
    headers: xlsxHeaders(`tunggakan-${new Date().toISOString().slice(0, 10)}.xlsx`),
  })
}
