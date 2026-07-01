import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth-guard'
import { KelasClient } from './kelas-client'
import type { Major, SchoolClass } from '@/types'

export const metadata: Metadata = { title: 'Kelas' }

export default async function KelasPage() {
  const { serviceClient } = await requireRole(['ADMIN'])
  const [classesRes, majorsRes] = await Promise.all([
    serviceClient.from('classes').select('id, name, grade, major_id, majors(code, name)').order('name'),
    serviceClient.from('majors').select('id, code, name').order('code'),
  ])
  return (
    <KelasClient
      classes={(classesRes.data ?? []) as unknown as SchoolClass[]}
      majors={(majorsRes.data ?? []) as Major[]}
    />
  )
}
