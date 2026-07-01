import type { Metadata } from 'next'
import { ScrollText, Download } from 'lucide-react'
import { requireRole } from '@/lib/auth-guard'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PdfExportButton } from '@/components/ui/pdf-export-button'
import { AuditTable } from './audit-table'
import { getSchoolSettings } from '@/lib/school'
import { formatDateTime, ROLE_LABEL } from '@/lib/utils'
import type { AuditLog } from '@/types'

export const metadata: Metadata = { title: 'Audit Log' }

export default async function AuditPage() {
  const { serviceClient } = await requireRole(['ADMIN'])
  const [{ data }, schoolSettings] = await Promise.all([
    serviceClient
      .from('audit_logs')
      .select('id, username, role, action, entity, detail, ip_address, created_at')
      .order('created_at', { ascending: false })
      .limit(300),
    getSchoolSettings(serviceClient),
  ])
  const logs = (data ?? []) as AuditLog[]

  const pdfRows = logs.map((l) => [
    formatDateTime(l.created_at), l.username ?? '', l.role ? (ROLE_LABEL[l.role] ?? l.role) : '',
    l.action, l.entity ?? '', l.detail ?? '',
  ])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Audit Log"
        description="Catatan seluruh aktivitas sistem. Tidak dapat dihapus."
        actions={
          <>
            <a href="/api/audit/export" className="btn btn-secondary btn-sm"><Download size={16} /> Export Excel</a>
            <PdfExportButton
              title="Audit Log"
              subtitle={schoolSettings.school_name}
              columns={['Waktu', 'Pengguna', 'Role', 'Aksi', 'Entitas', 'Detail']}
              rows={pdfRows}
              filename="audit-log.pdf"
            />
          </>
        }
      />
      <div className="clay overflow-hidden">
        {logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="Belum ada aktivitas" />
        ) : (
          <AuditTable logs={logs} />
        )}
      </div>
    </div>
  )
}
