import { NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

// Restore order respects foreign-key dependencies.
const ORDER = [
  'roles', 'majors', 'academic_years', 'classes', 'spp_rates',
  'students', 'bills', 'payments', 'period_locks', 'payment_settings', 'audit_logs',
]

export async function POST(req: Request) {
  const ctx = await getSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(ctx.user.role, 'backup')) {
    return NextResponse.json({ error: 'Hanya admin yang diizinkan.' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 400 })

  let parsed: { tables?: Record<string, unknown[]> }
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    return NextResponse.json({ error: 'File backup tidak valid (bukan JSON).' }, { status: 400 })
  }
  const tables = parsed.tables
  if (!tables || typeof tables !== 'object') {
    return NextResponse.json({ error: 'Struktur backup tidak dikenali.' }, { status: 400 })
  }

  let restored = 0
  for (const table of ORDER) {
    const rows = tables[table]
    if (!Array.isArray(rows) || rows.length === 0) continue
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500) as Record<string, unknown>[]
      const { error } = await ctx.serviceClient.from(table).upsert(chunk, { onConflict: 'id' })
      if (error) {
        return NextResponse.json({ error: `Gagal memulihkan tabel ${table}: ${error.message}`, restored }, { status: 500 })
      }
      restored += chunk.length
    }
  }

  await logAudit(ctx.serviceClient, ctx.user, { action: 'RESTORE', entity: 'database', detail: `Restore ${restored} baris` })
  return NextResponse.json({ ok: true, restored })
}
