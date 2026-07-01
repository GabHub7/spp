import { LogoMark } from '@/components/app/brand'
import { formatCurrency } from '@/lib/utils'

export interface ReceiptProps {
  schoolName: string
  logoUrl?: string | null
  /** Optional address / sub-line under the school name. */
  schoolSub?: string
  title?: string
  amount: number
  statusLabel?: string
  rows: [string, string][]
  note?: string | null
  footer?: string
}

/**
 * Compact payment receipt sized for kwitansi / thermal roll paper (≈ 80mm),
 * NOT A4. The embedded print rule sets the page size only when this receipt
 * page is printed (the only routes that call window.print()).
 */
export function Receipt({
  schoolName,
  logoUrl,
  schoolSub = 'Bukti Pembayaran SPP',
  title = 'BUKTI PEMBAYARAN',
  amount,
  statusLabel = 'LUNAS',
  rows,
  note,
  footer = 'Terima kasih. Simpan struk ini sebagai bukti pembayaran yang sah.',
}: ReceiptProps) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html:
            '@media print{@page{size:80mm auto;margin:4mm}html,body{background:#fff!important}.receipt-paper{box-shadow:none!important;border:none!important;width:auto!important;margin:0!important;padding:0!important}}',
        }}
      />
      <div
        className="receipt-paper clay print-area mx-auto p-5"
        style={{ width: '80mm', maxWidth: '100%' }}
        id="receipt"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-1.5 pb-3">
          <LogoMark size={40} logoUrl={logoUrl} alt={`Lambang ${schoolName}`} />
          <p className="font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>{schoolName}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{schoolSub}</p>
        </div>

        <div style={{ borderTop: '1px dashed var(--text-muted)' }} />

        <p className="text-center text-[11px] font-bold tracking-widest mt-3 mb-1" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </p>

        {/* Amount */}
        <div className="text-center py-2">
          <p className="text-2xl font-extrabold" style={{ color: 'var(--accent)' }}>{formatCurrency(Number(amount))}</p>
          <span className="badge status-success mt-1">{statusLabel}</span>
        </div>

        <div style={{ borderTop: '1px dashed var(--text-muted)' }} />

        {/* Detail rows */}
        <dl className="flex flex-col gap-1.5 py-3 text-[12px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-3">
              <dt className="shrink-0" style={{ color: 'var(--text-secondary)' }}>{k}</dt>
              <dd className="font-semibold text-right" style={{ color: 'var(--text-primary)' }}>{v}</dd>
            </div>
          ))}
          {note && (
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0" style={{ color: 'var(--text-secondary)' }}>Catatan</dt>
              <dd className="text-right" style={{ color: 'var(--text-primary)' }}>{note}</dd>
            </div>
          )}
        </dl>

        <div style={{ borderTop: '1px dashed var(--text-muted)' }} />

        <p className="text-center text-[10px] leading-snug mt-3" style={{ color: 'var(--text-muted)' }}>
          {footer}
        </p>
      </div>
    </>
  )
}
