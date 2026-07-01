import type { Metadata } from 'next'
import { LupaPasswordForm } from './lupa-form'

export const metadata: Metadata = { title: 'Lupa Password' }

export default function LupaPasswordPage() {
  return <LupaPasswordForm />
}
