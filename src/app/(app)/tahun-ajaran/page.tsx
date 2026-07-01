import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth-guard'
import { TahunAjaranClient } from './tahun-ajaran-client'
import type { AcademicYear } from '@/types'

export const metadata: Metadata = { title: 'Tahun Ajaran' }

export default async function TahunAjaranPage() {
  const { serviceClient } = await requireRole(['ADMIN'])
  const { data } = await serviceClient
    .from('academic_years')
    .select('id, name, is_active')
    .order('name', { ascending: false })
  return <TahunAjaranClient years={(data ?? []) as AcademicYear[]} />
}
