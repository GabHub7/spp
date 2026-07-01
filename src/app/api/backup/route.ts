import { NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

const TABLES = [
  'roles', 'majors', 'academic_years', 'classes', 'spp_rates',
  'students', 'bills', 'payments', 'period_locks', 'payment_settings', 'audit_logs',
]

export async function GET() {
  const ctx = await getSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(ctx.user.role, 'backup')) {
    return NextResponse.json({ error: 'Hanya admin yang diizinkan.' }, { status: 403 })
  }

  const dump: Record<string, unknown[]> = {}
  for (const table of TABLES) {
    const { data } = await ctx.serviceClient.from(table).select('*').limit(100000)
    dump[table] = data ?? []
  }

  await logAudit(ctx.serviceClient, ctx.user, { action: 'BACKUP', entity: 'database', detail: 'Backup manual' })

  const payload = {
    app: 'PoncolPay',
    version: 1,
    generated_at: new Date().toISOString(),
    tables: dump,
  }
  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="backup-${date}.json"`,
    },
  })
}
