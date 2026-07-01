import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth-guard'
import { TarifClient } from './tarif-client'
import type { AcademicYear, SppRate } from '@/types'

export const metadata: Metadata = { title: 'Tarif SPP' }

export default async function TarifPage() {
  const { serviceClient } = await requireRole(['ADMIN'])
  const [yearsRes, ratesRes] = await Promise.all([
    serviceClient.from('academic_years').select('id, name, is_active').order('name', { ascending: false }),
    serviceClient.from('spp_rates').select('id, academic_year_id, amount, note, created_at').order('created_at', { ascending: false }),
  ])
  return (
    <TarifClient
      years={(yearsRes.data ?? []) as AcademicYear[]}
      rates={(ratesRes.data ?? []) as SppRate[]}
    />
  )
}
