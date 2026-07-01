import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth-guard'
import { JurusanClient } from './jurusan-client'
import type { Major } from '@/types'

export const metadata: Metadata = { title: 'Jurusan' }

export default async function JurusanPage() {
  const { serviceClient } = await requireRole(['ADMIN'])
  const { data } = await serviceClient.from('majors').select('id, code, name').order('code')
  return <JurusanClient majors={(data ?? []) as Major[]} />
}
