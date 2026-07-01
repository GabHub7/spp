import type { Metadata } from 'next'
import { requireRole, can } from '@/lib/auth-guard'
import { SiswaClient } from './siswa-client'
import type { SchoolClass, Major, Student } from '@/types'

export const metadata: Metadata = { title: 'Data Siswa' }

export default async function SiswaPage() {
  const { user, serviceClient } = await requireRole(['ADMIN', 'BENDAHARA'])

  const [studentsRes, classesRes, majorsRes] = await Promise.all([
    serviceClient
      .from('students')
      .select('id, nis, full_name, gender, status, parent_name, parent_phone, address, class_id, major_id, classes(name, grade), majors(code, name)')
      .order('full_name')
      .limit(3000),
    serviceClient.from('classes').select('id, name, grade, major_id').order('name'),
    serviceClient.from('majors').select('id, code, name').order('code'),
  ])

  return (
    <SiswaClient
      canManage={can(user.role, 'manageMasterData')}
      students={(studentsRes.data ?? []) as unknown as Student[]}
      classes={(classesRes.data ?? []) as SchoolClass[]}
      majors={(majorsRes.data ?? []) as Major[]}
    />
  )
}
