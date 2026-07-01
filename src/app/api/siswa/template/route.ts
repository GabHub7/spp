import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-guard'
import { rowsToXlsx, xlsxHeaders } from '@/lib/excel'

export async function GET() {
  const ctx = await getSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Example row guides the user on the expected format.
  const example = {
    NIS: '2026001',
    Nama: 'Contoh Siswa',
    'Jenis Kelamin': 'Laki-laki',
    Jurusan: 'RPL',
    Kelas: 'X RPL 1',
    'Nama Orang Tua': 'Contoh Orang Tua',
    'No HP Orang Tua': '081234567890',
    Alamat: 'Jl. Contoh No. 1',
  }
  const buffer = rowsToXlsx([example], 'Template Siswa')
  return new NextResponse(new Uint8Array(buffer), {
    headers: xlsxHeaders('template-import-siswa.xlsx'),
  })
}
