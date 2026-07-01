import { NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth-guard'
import { getActiveYear } from '@/lib/queries'
import { xlsxToRows } from '@/lib/excel'
import { logAudit } from '@/lib/audit'

function pick(row: Record<string, unknown>, keys: string[]): string {
  const norm: Record<string, unknown> = {}
  for (const k of Object.keys(row)) norm[k.trim().toLowerCase()] = row[k]
  for (const k of keys) {
    const v = norm[k.toLowerCase()]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

export async function POST(req: Request) {
  const ctx = await getSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(ctx.user.role, 'manageMasterData')) {
    return NextResponse.json({ error: 'Tidak memiliki akses impor.' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 400 })
  }

  let rows: Record<string, unknown>[]
  try {
    rows = xlsxToRows(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'File tidak dapat dibaca. Pastikan format .xlsx/.csv.' }, { status: 400 })
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: 'File kosong.' }, { status: 400 })
  }

  const { serviceClient } = ctx
  const [year, classesRes, majorsRes, existingRes] = await Promise.all([
    getActiveYear(serviceClient),
    serviceClient.from('classes').select('id, name, major_id'),
    serviceClient.from('majors').select('id, code, name'),
    serviceClient.from('students').select('nis'),
  ])

  const classByName = new Map<string, { id: string; major_id: string | null }>()
  for (const c of (classesRes.data ?? []) as { id: string; name: string; major_id: string | null }[]) {
    classByName.set(c.name.trim().toLowerCase(), { id: c.id, major_id: c.major_id })
  }
  const majorByKey = new Map<string, string>()
  for (const m of (majorsRes.data ?? []) as { id: string; code: string; name: string }[]) {
    majorByKey.set(m.code.trim().toLowerCase(), m.id)
    majorByKey.set(m.name.trim().toLowerCase(), m.id)
  }
  const existingNis = new Set((existingRes.data ?? []).map((s) => String((s as { nis: string }).nis)))

  const toInsert: Record<string, unknown>[] = []
  const errors: string[] = []
  let skipped = 0

  rows.forEach((row, idx) => {
    const line = idx + 2 // header is row 1
    const nis = pick(row, ['nis'])
    const name = pick(row, ['nama', 'nama siswa', 'full_name'])
    if (!nis || !name) {
      errors.push(`Baris ${line}: NIS/Nama kosong`)
      skipped++
      return
    }
    if (existingNis.has(nis)) {
      skipped++
      return
    }
    existingNis.add(nis)

    const genderRaw = pick(row, ['jenis kelamin', 'l/p', 'gender']).toLowerCase()
    const gender = genderRaw.startsWith('p') ? 'P' : 'L'

    const className = pick(row, ['kelas', 'class'])
    const cls = className ? classByName.get(className.toLowerCase()) : undefined
    const majorName = pick(row, ['jurusan', 'major'])
    const majorId = majorName ? majorByKey.get(majorName.toLowerCase()) ?? null : cls?.major_id ?? null

    toInsert.push({
      nis,
      full_name: name,
      gender,
      class_id: cls?.id ?? null,
      major_id: majorId,
      academic_year_id: year?.id ?? null,
      parent_name: pick(row, ['nama orang tua', 'orang tua', 'wali']) || null,
      parent_phone: pick(row, ['no hp orang tua', 'no_hp', 'nohp', 'no hp', 'telepon', 'phone']) || null,
      address: pick(row, ['alamat', 'address']) || null,
      status: 'ACTIVE',
    })
  })

  let inserted = 0
  if (toInsert.length > 0) {
    // Insert in chunks to stay within payload limits.
    for (let i = 0; i < toInsert.length; i += 500) {
      const chunk = toInsert.slice(i, i + 500)
      const { error, count } = await serviceClient
        .from('students')
        .insert(chunk, { count: 'exact' })
      if (error) {
        errors.push(`Gagal menyimpan sebagian data: ${error.message}`)
        break
      }
      inserted += count ?? chunk.length
    }
  }

  await logAudit(serviceClient, ctx.user, {
    action: 'IMPORT',
    entity: 'student',
    detail: `Impor siswa: ${inserted} ditambahkan, ${skipped} dilewati`,
  })

  return NextResponse.json({ inserted, skipped, errors })
}
