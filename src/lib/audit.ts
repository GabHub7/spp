import 'server-only'
import { headers } from 'next/headers'
import type { SupabaseServiceClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/lib/auth-guard'

interface AuditEntry {
  action: string
  entity?: string
  entityId?: string
  detail?: string
}

/**
 * Writes an immutable audit-log row (Modul 12 / BR-008). Best-effort:
 * audit failures must never block the primary operation.
 */
export async function logAudit(
  serviceClient: SupabaseServiceClient,
  user: Pick<SessionUser, 'id' | 'username' | 'role'>,
  entry: AuditEntry
): Promise<void> {
  try {
    let ip: string | null = null
    let ua: string | null = null
    try {
      const h = await headers()
      ip =
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        h.get('x-real-ip') ??
        null
      ua = h.get('user-agent')
    } catch {
      /* headers unavailable outside a request — ignore */
    }

    await serviceClient.from('audit_logs').insert({
      user_id: user.id,
      username: user.username,
      role: user.role,
      action: entry.action,
      entity: entry.entity ?? null,
      entity_id: entry.entityId ?? null,
      detail: entry.detail ?? null,
      ip_address: ip,
      user_agent: ua,
    })
  } catch {
    /* swallow — auditing is best-effort */
  }
}
