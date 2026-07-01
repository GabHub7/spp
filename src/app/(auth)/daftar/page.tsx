import type { Metadata } from 'next'
import { DaftarForm } from './daftar-form'

export const metadata: Metadata = { title: 'Daftar Orang Tua' }

export default function DaftarPage() {
  return <DaftarForm />
}
