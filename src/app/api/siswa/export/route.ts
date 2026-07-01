import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-guard'
import { rowsToXlsx, xlsxHeaders } from '@/lib/excel'
import { STUDENT_STATUS_LABEL } from '@/lib/utils'
import type { Student } from '@/types'

export async function GET() {
  const ctx = await getSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await ctx.serviceClient
    .from('students')
    .select('nis, full_name, gender, parent_name, parent_phone, address, status, classes(name), majors(code, name)')
    .order('full_name')
    .limit(5000)

  const rows = ((data ?? []) as unknown as Student[]).map((s) => ({
    NIS: s.nis,
    Nama: s.full_name,
    'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
    Jurusan: s.majors?.code ?? '',
    Kelas: s.classes?.name ?? '',
    'Nama Orang Tua': s.parent_name ?? '',
    'No HP Orang Tua': s.parent_phone ?? '',
    Alamat: s.address ?? '',
    Status: STUDENT_STATUS_LABEL[s.status] ?? s.status,
  }))

  const buffer = rowsToXlsx(rows.length ? rows : [{ NIS: '', Nama: '' }], 'Data Siswa')
  return new NextResponse(new Uint8Array(buffer), {
    headers: xlsxHeaders(`data-siswa-${new Date().toISOString().slice(0, 10)}.xlsx`),
  })
}
