import 'server-only'
import type { SupabaseServiceClient } from '@/lib/supabase/server'
import type { AcademicYear } from '@/types'
import { monthName, billLabel, isDisplayedAsInstallment } from '@/lib/utils'

export async function getActiveYear(
  service: SupabaseServiceClient
): Promise<AcademicYear | null> {
  const { data } = await service
    .from('academic_years')
    .select('id, name, is_active')
    .eq('is_active', true)
    .maybeSingle()
  return (data as AcademicYear) ?? null
}

function sum(rows: { amount: number | string }[]): number {
  return rows.reduce((acc, r) => acc + Number(r.amount), 0)
}

export interface DashboardStats {
  totalStudents: number
  paidToday: number
  paidThisMonth: number
  arrearsAmount: number
  unpaidCount: number
  paidPercent: number
  pendingVerifications: number
  monthly: { label: string; total: number }[]
}

export async function getDashboardStats(
  service: SupabaseServiceClient
): Promise<DashboardStats> {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startYear = new Date(now.getFullYear(), 0, 1).toISOString()

  const [studentsRes, todayRes, monthRes, unpaidRes, paidCountRes, totalBillsRes, yearPays, pendingRes] =
    await Promise.all([
      service.from('students').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      service
        .from('payments')
        .select('amount')
        .eq('status', 'SUCCESS')
        .eq('is_deleted', false)
        .gte('paid_at', startToday),
      service
        .from('payments')
        .select('amount')
        .eq('status', 'SUCCESS')
        .eq('is_deleted', false)
        .gte('paid_at', startMonth),
      service.from('bills').select('amount, paid_amount').in('status', ['UNPAID', 'PARTIAL']),
      service.from('bills').select('id', { count: 'exact', head: true }).eq('status', 'PAID'),
      service.from('bills').select('id', { count: 'exact', head: true }),
      service
        .from('payments')
        .select('amount, paid_at')
        .eq('status', 'SUCCESS')
        .eq('is_deleted', false)
        .gte('paid_at', startYear),
      service
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING')
        .eq('is_deleted', false),
    ])

  const unpaidRows = (unpaidRes.data ?? []) as { amount: number; paid_amount: number }[]
  const arrearsAmount = unpaidRows.reduce((acc, r) => acc + Math.max(Number(r.amount) - Number(r.paid_amount), 0), 0)
  const totalBills = totalBillsRes.count ?? 0
  const paidBills = paidCountRes.count ?? 0

  const monthlyMap = new Array(12).fill(0)
  for (const p of (yearPays.data ?? []) as { amount: number; paid_at: string }[]) {
    const m = new Date(p.paid_at).getMonth()
    monthlyMap[m] += Number(p.amount)
  }
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

  return {
    totalStudents: studentsRes.count ?? 0,
    paidToday: sum((todayRes.data ?? []) as { amount: number }[]),
    paidThisMonth: sum((monthRes.data ?? []) as { amount: number }[]),
    arrearsAmount,
    unpaidCount: unpaidRows.length,
    paidPercent: totalBills > 0 ? Math.round((paidBills / totalBills) * 100) : 0,
    pendingVerifications: pendingRes.count ?? 0,
    monthly: labels.map((label, i) => ({ label, total: monthlyMap[i] })),
  }
}

export interface PaymentFilters {
  q?: string
  from?: string
  to?: string
  method?: string
}

export interface PaymentHistoryRow {
  id: string
  transaction_no: string
  paid_at: string
  amount: number
  method: string
  is_installment: boolean
  officer_name: string | null
  nis: string
  full_name: string
  class_name: string
  period: string
}

export async function fetchPaymentHistory(
  service: SupabaseServiceClient,
  f: PaymentFilters,
  limit = 3000
): Promise<PaymentHistoryRow[]> {
  let query = service
    .from('payments')
    .select('id, transaction_no, paid_at, amount, method, is_installment, officer_name, students(nis, full_name, classes(name)), bills(period_month, period_year, bill_type, title, status)')
    .eq('is_deleted', false)
    .eq('status', 'SUCCESS')
    .order('paid_at', { ascending: false })
    .limit(limit)

  if (f.method) query = query.eq('method', f.method)
  if (f.from) query = query.gte('paid_at', new Date(f.from + 'T00:00:00').toISOString())
  if (f.to) query = query.lte('paid_at', new Date(f.to + 'T23:59:59').toISOString())

  const { data } = await query
  type Raw = {
    id: string
    transaction_no: string
    paid_at: string
    amount: number
    method: string
    is_installment: boolean
    officer_name: string | null
    students: { nis: string; full_name: string; classes: { name: string } | null } | null
    bills: { period_month: number; period_year: number; bill_type: string | null; title: string | null; status: string } | null
  }

  let rows = ((data ?? []) as unknown as Raw[]).map((p) => ({
    id: p.id,
    transaction_no: p.transaction_no,
    paid_at: p.paid_at,
    amount: Number(p.amount),
    method: p.method,
    is_installment: isDisplayedAsInstallment(p, p.bills),
    officer_name: p.officer_name,
    nis: p.students?.nis ?? '',
    full_name: p.students?.full_name ?? '',
    class_name: p.students?.classes?.name ?? '',
    period: p.bills ? billLabel(p.bills) : '',
  }))

  const term = f.q?.trim().toLowerCase()
  if (term) {
    rows = rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(term) ||
        r.nis.toLowerCase().includes(term) ||
        r.transaction_no.toLowerCase().includes(term)
    )
  }
  return rows
}

export interface ArrearRow {
  student_id: string
  nis: string
  full_name: string
  class_name: string
  major_code: string
  months: number
  amount: number
  periods: string
}

export async function fetchArrears(service: SupabaseServiceClient): Promise<ArrearRow[]> {
  const year = await getActiveYear(service)
  if (!year) return []

  const { data } = await service
    .from('bills')
    .select('student_id, amount, paid_amount, period_month, period_year, bill_type, title, students!inner(nis, full_name, status, classes(name), majors(code))')
    .eq('academic_year_id', year.id)
    .in('status', ['UNPAID', 'PARTIAL'])
    .limit(40000)

  type Raw = {
    student_id: string
    amount: number
    paid_amount: number
    period_month: number
    period_year: number
    bill_type: string | null
    title: string | null
    students: { nis: string; full_name: string; status: string; classes: { name: string } | null; majors: { code: string } | null } | null
  }

  const map = new Map<string, ArrearRow & { _periods: string[] }>()
  for (const b of (data ?? []) as unknown as Raw[]) {
    if (!b.students || b.students.status !== 'ACTIVE') continue
    const remaining = Math.max(Number(b.amount) - Number(b.paid_amount), 0)
    if (remaining <= 0) continue
    const cur = map.get(b.student_id) ?? {
      student_id: b.student_id,
      nis: b.students.nis,
      full_name: b.students.full_name,
      class_name: b.students.classes?.name ?? '',
      major_code: b.students.majors?.code ?? '',
      months: 0,
      amount: 0,
      periods: '',
      _periods: [],
    }
    cur.months += 1
    cur.amount += remaining
    cur._periods.push(billLabel(b))
    map.set(b.student_id, cur)
  }

  return Array.from(map.values())
    .map((r) => ({ ...r, periods: r._periods.join(', ') }))
    .sort((a, b) => b.amount - a.amount)
}

export interface ChildBill {
  id: string
  period_month: number
  period_year: number
  bill_type: string
  label: string
  amount: number
  remaining: number
  status: string
  pending: boolean
}

export interface ChildBills {
  student: { id: string; nis: string; full_name: string; class_name: string }
  bills: ChildBill[]
  unpaidTotal: number
  unpaidCount: number
  pendingCount: number
}

/** A parent's linked children with their SPP bills for the active year. */
export async function getParentChildren(
  service: SupabaseServiceClient,
  parentUserId: string
): Promise<ChildBills[]> {
  const { data: studentsData } = await service
    .from('students')
    .select('id, nis, full_name, classes(name)')
    .eq('parent_user_id', parentUserId)
    .order('full_name')

  const students = ((studentsData ?? []) as unknown as {
    id: string
    nis: string
    full_name: string
    classes: { name: string } | null
  }[])
  if (students.length === 0) return []

  const year = await getActiveYear(service)
  const ids = students.map((s) => s.id)

  const [{ data: billsData }, { data: pendingData }] = await Promise.all([
    year
      ? service
          .from('bills')
          .select('id, student_id, period_month, period_year, amount, paid_amount, bill_type, title, status')
          .in('student_id', ids)
          .eq('academic_year_id', year.id)
          .order('bill_type')
          .order('period_year')
          .order('period_month')
      : Promise.resolve({ data: [] as unknown[] }),
    service
      .from('payments')
      .select('bill_id')
      .in('student_id', ids)
      .eq('status', 'PENDING')
      .eq('is_deleted', false),
  ])

  const pendingBillIds = new Set(((pendingData ?? []) as { bill_id: string }[]).map((p) => p.bill_id))
  const billsByStudent = new Map<string, ChildBill[]>()
  for (const b of (billsData ?? []) as {
    id: string
    student_id: string
    period_month: number
    period_year: number
    amount: number
    paid_amount: number
    bill_type: string | null
    title: string | null
    status: string
  }[]) {
    const arr = billsByStudent.get(b.student_id) ?? []
    const amount = Number(b.amount)
    arr.push({
      id: b.id,
      period_month: b.period_month,
      period_year: b.period_year,
      bill_type: b.bill_type ?? 'SPP',
      label: billLabel(b),
      amount,
      remaining: Math.max(amount - Number(b.paid_amount), 0),
      status: b.status,
      pending: pendingBillIds.has(b.id),
    })
    billsByStudent.set(b.student_id, arr)
  }

  return students.map((s) => {
    const bills = billsByStudent.get(s.id) ?? []
    const unpaid = bills.filter((b) => b.status !== 'PAID')
    return {
      student: { id: s.id, nis: s.nis, full_name: s.full_name, class_name: s.classes?.name ?? '' },
      bills,
      unpaidTotal: unpaid.reduce((sum, b) => sum + b.remaining, 0),
      unpaidCount: unpaid.length,
      pendingCount: bills.filter((b) => b.pending).length,
    }
  })
}

export interface MonthlyBreakdownRow {
  month: number
  label: string
  count: number
  total: number
}

/** Per-month payment totals + transaction counts for a calendar year. */
export async function fetchYearlyBreakdown(
  service: SupabaseServiceClient,
  calendarYear: number
): Promise<MonthlyBreakdownRow[]> {
  const start = new Date(calendarYear, 0, 1).toISOString()
  const end = new Date(calendarYear + 1, 0, 1).toISOString()
  const { data } = await service
    .from('payments')
    .select('amount, paid_at')
    .eq('status', 'SUCCESS')
    .eq('is_deleted', false)
    .gte('paid_at', start)
    .lt('paid_at', end)
    .limit(200000)

  const counts = new Array(12).fill(0)
  const totals = new Array(12).fill(0)
  for (const p of (data ?? []) as { amount: number; paid_at: string }[]) {
    const m = new Date(p.paid_at).getMonth()
    counts[m] += 1
    totals[m] += Number(p.amount)
  }
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: monthName(i + 1),
    count: counts[i],
    total: totals[i],
  }))
}
