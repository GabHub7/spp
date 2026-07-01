import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getSession, can } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'
import { billLabel, formatDateTime, STUDENT_STATUS_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/utils'

/**
 * Human-readable backup as a multi-sheet Excel workbook — for records/reading,
 * not for restore (the JSON backup at /api/backup remains the restore source).
 */
export async function GET() {
  const ctx = await getSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(ctx.user.role, 'backup')) {
    return NextResponse.json({ error: 'Hanya admin yang diizinkan.' }, { status: 403 })
  }
  const { serviceClient } = ctx

  const [studentsRes, billsRes, paymentsRes, usersRes] = await Promise.all([
    serviceClient
      .from('students')
      .select('nis, full_name, gender, status, parent_name, parent_phone, address, classes(name), majors(code)')
      .order('full_name')
      .limit(20000),
    serviceClient
      .from('bills')
      .select('period_month, period_year, bill_type, title, amount, paid_amount, status, students(nis, full_name)')
      .order('created_at', { ascending: false })
      .limit(20000),
    serviceClient
      .from('payments')
      .select('transaction_no, amount, method, status, is_installment, paid_at, officer_name, students(nis, full_name)')
      .eq('is_deleted', false)
      .order('paid_at', { ascending: false })
      .limit(20000),
    serviceClient.from('users').select('username, full_name, email, status, roles(name)').order('full_name').limit(2000),
  ])

  type StudentRow = { nis: string; full_name: string; gender: string; status: string; parent_name: string | null; parent_phone: string | null; address: string | null; classes: { name: string } | null; majors: { code: string } | null }
  type BillRow = { period_month: number; period_year: number; bill_type: string | null; title: string | null; amount: number; paid_amount: number; status: string; students: { nis: string; full_name: string } | null }
  type PaymentRow = { transaction_no: string; amount: number; method: string; status: string; is_installment: boolean; paid_at: string; officer_name: string | null; students: { nis: string; full_name: string } | null }
  type UserRow = { username: string; full_name: string; email: string | null; status: string; roles: { name: string } | null }

  const students = ((studentsRes.data ?? []) as unknown as StudentRow[]).map((s) => ({
    NIS: s.nis, Nama: s.full_name, 'L/P': s.gender, Status: STUDENT_STATUS_LABEL[s.status] ?? s.status,
    Kelas: s.classes?.name ?? '', Jurusan: s.majors?.code ?? '',
    'Nama Orang Tua': s.parent_name ?? '', 'No. HP Orang Tua': s.parent_phone ?? '', Alamat: s.address ?? '',
  }))

  const bills = ((billsRes.data ?? []) as unknown as BillRow[]).map((b) => ({
    NIS: b.students?.nis ?? '', Nama: b.students?.full_name ?? '', Keterangan: billLabel(b),
    Nominal: Number(b.amount), Terbayar: Number(b.paid_amount), Status: b.status,
  }))

  const payments = ((paymentsRes.data ?? []) as unknown as PaymentRow[]).map((p) => ({
    'No. Transaksi': p.transaction_no, NIS: p.students?.nis ?? '', Nama: p.students?.full_name ?? '',
    Nominal: Number(p.amount), Metode: PAYMENT_METHOD_LABEL[p.method] ?? p.method,
    Status: p.status, Cicilan: p.is_installment ? 'Ya' : 'Tidak', Tanggal: formatDateTime(p.paid_at), Petugas: p.officer_name ?? '',
  }))

  const users = ((usersRes.data ?? []) as unknown as UserRow[]).map((u) => ({
    Username: u.username, Nama: u.full_name, Email: u.email ?? '', Role: u.roles?.name ?? '', Status: u.status,
  }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(students.length ? students : [{ Info: 'Tidak ada data' }]), 'Siswa')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(bills.length ? bills : [{ Info: 'Tidak ada data' }]), 'Tagihan')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payments.length ? payments : [{ Info: 'Tidak ada data' }]), 'Pembayaran')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(users.length ? users : [{ Info: 'Tidak ada data' }]), 'Pengguna')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  await logAudit(serviceClient, ctx.user, { action: 'BACKUP', entity: 'database', detail: 'Backup Excel (baca-saja)' })

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="backup-excel-${date}.xlsx"`,
    },
  })
}
