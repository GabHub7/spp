// ── PoncolPay domain types ────────────────────────────────────

export type RoleName = 'ADMIN' | 'BENDAHARA' | 'KEPALA_SEKOLAH' | 'ORANG_TUA'
export type UserStatus = 'ACTIVE' | 'INACTIVE'
export type Gender = 'L' | 'P'
export type StudentStatus = 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'DROPPED'
export type BillStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type BillType = 'SPP' | 'SERAGAM' | 'PTS' | 'PAS' | 'DAFTAR_ULANG' | 'LAINNYA'
export type PaymentMethod = 'TUNAI' | 'TRANSFER' | 'QRIS'
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'

export interface Role {
  id: string
  name: RoleName
  label: string
}

export interface AppUser {
  id: string
  auth_id: string | null
  username: string
  full_name: string
  email: string | null
  role_id: string
  status: UserStatus
  created_at: string
  roles?: { name: RoleName; label: string } | null
}

export interface Major {
  id: string
  code: string
  name: string
}

export interface AcademicYear {
  id: string
  name: string
  is_active: boolean
}

export interface SchoolClass {
  id: string
  name: string
  grade: string
  major_id: string | null
  majors?: { code: string; name: string } | null
}

export interface SppRate {
  id: string
  academic_year_id: string
  amount: number
  note: string | null
  created_at: string
}

export interface Student {
  id: string
  nis: string
  full_name: string
  gender: Gender
  class_id: string | null
  major_id: string | null
  academic_year_id: string | null
  parent_name: string | null
  parent_phone: string | null
  address: string | null
  status: StudentStatus
  created_at: string
  classes?: { name: string; grade: string } | null
  majors?: { code: string; name: string } | null
}

export interface Bill {
  id: string
  student_id: string
  academic_year_id: string
  period_month: number
  period_year: number
  amount: number
  paid_amount: number
  bill_type: BillType
  title: string | null
  status: BillStatus
  is_locked: boolean
  due_date: string | null
  students?: Pick<Student, 'nis' | 'full_name'> | null
}

export interface Payment {
  id: string
  transaction_no: string
  bill_id: string
  student_id: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  is_installment: boolean
  paid_at: string
  officer_name: string | null
  proof_url: string | null
  note: string | null
  is_deleted: boolean
}

export interface PaymentSettings {
  id: number
  bank_name: string | null
  bank_account_no: string | null
  bank_account_holder: string | null
  qris_image_url: string | null
  qris_provider: string | null
}

export interface AuditLog {
  id: string
  user_id: string | null
  username: string | null
  role: string | null
  action: string
  entity: string | null
  entity_id: string | null
  detail: string | null
  ip_address: string | null
  created_at: string
}
