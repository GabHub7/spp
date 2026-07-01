import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth-guard'
import { getAllGuides } from '@/lib/guides'
import { PanduanClient } from './panduan-client'

export const metadata: Metadata = { title: 'Panduan Penggunaan' }

export default async function PanduanPage() {
  await requireRole(['ADMIN', 'BENDAHARA', 'KEPALA_SEKOLAH'])
  return <PanduanClient guides={getAllGuides()} />
}
