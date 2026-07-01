import type { RoleName } from '@/types'
import {
  LayoutDashboard, Users, FileText, CreditCard, History, AlertTriangle,
  Layers, GraduationCap, CalendarRange, BadgeDollarSign, BarChart3,
  ScrollText, Settings, BadgeCheck, HelpCircle, type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles: RoleName[]
}

export interface NavSection {
  title: string
  items: NavItem[]
}

const ALL: RoleName[] = ['ADMIN', 'BENDAHARA', 'KEPALA_SEKOLAH']
const OPS: RoleName[] = ['ADMIN', 'BENDAHARA']
const ADMIN_ONLY: RoleName[] = ['ADMIN']

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Utama',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ALL }],
  },
  {
    title: 'Operasional',
    items: [
      { href: '/siswa', label: 'Data Siswa', icon: Users, roles: OPS },
      { href: '/tagihan', label: 'Tagihan', icon: FileText, roles: OPS },
      { href: '/pembayaran', label: 'Pembayaran', icon: CreditCard, roles: OPS },
      { href: '/verifikasi', label: 'Verifikasi', icon: BadgeCheck, roles: OPS },
      { href: '/riwayat', label: 'Riwayat', icon: History, roles: OPS },
      { href: '/tunggakan', label: 'Tunggakan', icon: AlertTriangle, roles: ALL },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { href: '/kelas', label: 'Kelas', icon: Layers, roles: ADMIN_ONLY },
      { href: '/jurusan', label: 'Jurusan', icon: GraduationCap, roles: ADMIN_ONLY },
      { href: '/tahun-ajaran', label: 'Tahun Ajaran', icon: CalendarRange, roles: ADMIN_ONLY },
      { href: '/tarif', label: 'Tarif SPP', icon: BadgeDollarSign, roles: ADMIN_ONLY },
    ],
  },
  {
    title: 'Laporan & Sistem',
    items: [
      { href: '/laporan', label: 'Laporan', icon: BarChart3, roles: ALL },
      { href: '/audit', label: 'Audit Log', icon: ScrollText, roles: ADMIN_ONLY },
      { href: '/pengaturan', label: 'Pengaturan', icon: Settings, roles: ADMIN_ONLY },
    ],
  },
  {
    title: 'Bantuan',
    items: [
      { href: '/panduan', label: 'Panduan Penggunaan', icon: HelpCircle, roles: ALL },
    ],
  },
]

export function navForRole(role: RoleName): NavSection[] {
  return NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.roles.includes(role)),
  })).filter((s) => s.items.length > 0)
}
