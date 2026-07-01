import { NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth-guard'
import { rowsToXlsx, xlsxHeaders } from '@/lib/excel'
import { formatDateTime, ROLE_LABEL } from '@/lib/utils'
import type { AuditLog } from '@/types'

export async function GET() {
  const ctx = await getSession()
  if (!ctx || !can(ctx.user.role, 'backup')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await ctx.serviceClient
    .from('audit_logs')
    .select('id, username, role, action, entity, detail, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(2000)

  const rows = ((data ?? []) as AuditLog[]).map((l) => ({
    Waktu: formatDateTime(l.created_at),
    Pengguna: l.username ?? '',
    Role: l.role ? (ROLE_LABEL[l.role] ?? l.role) : '',
    Aksi: l.action,
    Entitas: l.entity ?? '',
    Detail: l.detail ?? '',
    IP: l.ip_address ?? '',
  }))

  const buffer = rowsToXlsx(rows.length ? rows : [{ Info: 'Tidak ada data' }], 'Audit Log')
  return new NextResponse(new Uint8Array(buffer), {
    headers: xlsxHeaders(`audit-log-${new Date().toISOString().slice(0, 10)}.xlsx`),
  })
}
