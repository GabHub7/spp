import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString))
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

// ── SPP-specific helpers ─────────────────────────────────────

/** Indonesian month names, index 1..12. */
export const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function monthName(m: number): string {
  return MONTH_NAMES[m] ?? String(m)
}

/**
 * The 12 SPP periods of an academic year run July → June.
 * Given the start calendar year, returns the ordered list of
 * { month, year } periods.
 */
export function academicPeriods(startYear: number): { month: number; year: number }[] {
  const periods: { month: number; year: number }[] = []
  for (let i = 0; i < 12; i++) {
    const month = ((6 + i) % 12) + 1 // 7,8,...,12,1,...,6
    const year = month >= 7 ? startYear : startYear + 1
    periods.push({ month, year })
  }
  return periods
}

/** Parses "2026/2027" → 2026. */
export function academicYearStart(name: string): number {
  const n = parseInt(name.slice(0, 4), 10)
  return Number.isNaN(n) ? new Date().getFullYear() : n
}

/** Transaction number format: SPP-YYYYMMDD-XXXX (BR-006). */
export function generateTransactionNo(seq: number): string {
  const now = new Date()
  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  return `SPP-${date}-${String(seq).padStart(4, '0')}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export const STUDENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Aktif',
  GRADUATED: 'Lulus',
  TRANSFERRED: 'Pindah',
  DROPPED: 'Keluar',
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  TUNAI: 'Tunai',
  TRANSFER: 'Transfer Bank',
  QRIS: 'QRIS',
}

/** Jenis pembayaran / tagihan. */
export const BILL_TYPE_LABEL: Record<string, string> = {
  SPP: 'SPP',
  SERAGAM: 'Seragam / Baju',
  PTS: 'PTS',
  PAS: 'PAS',
  DAFTAR_ULANG: 'Daftar Ulang',
  LAINNYA: 'Lainnya',
}

/**
 * Human label for a bill. SPP bills are labelled by their month/year period;
 * other types use their free-text title (falling back to the type label).
 */
export function billLabel(bill: {
  bill_type?: string | null
  title?: string | null
  period_month?: number | null
  period_year?: number | null
}): string {
  const type = bill.bill_type ?? 'SPP'
  if (type === 'SPP') {
    return `SPP ${monthName(bill.period_month ?? 0)} ${bill.period_year ?? ''}`.trim()
  }
  return bill.title?.trim() || BILL_TYPE_LABEL[type] || 'Tagihan'
}

/**
 * A cicilan payment only displays as "Cicilan" while its bill is still being
 * paid off; once the bill reaches PAID, every payment on it — including
 * earlier installments — is shown as Lunas. Centralized here so the three
 * call sites (riwayat, portal riwayat, pembayaran recent list) can't drift.
 */
export function isDisplayedAsInstallment(payment: { is_installment: boolean }, bill: { status?: string | null } | null): boolean {
  return payment.is_installment && bill?.status !== 'PAID'
}

export const BILL_STATUS_LABEL: Record<string, string> = {
  UNPAID: 'Belum Bayar',
  PARTIAL: 'Cicilan',
  PAID: 'Lunas',
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu',
  SUCCESS: 'Berhasil',
  FAILED: 'Gagal',
  CANCELLED: 'Dibatalkan',
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  BENDAHARA: 'Bendahara',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  ORANG_TUA: 'Orang Tua',
}

/** Returns the badge utility class for a given domain status. */
export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'PAID':
    case 'SUCCESS':
    case 'ACTIVE':
      return 'status-success'
    case 'UNPAID':
    case 'PENDING':
      return 'status-warning'
    case 'PARTIAL':
      return 'status-info'
    case 'FAILED':
    case 'DROPPED':
      return 'status-error'
    case 'GRADUATED':
      return 'status-info'
    default:
      return 'status-neutral'
  }
}
