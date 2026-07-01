'use client'

import Link from 'next/link'
import { HelpCircle } from 'lucide-react'

/**
 * Header shortcut to the standalone /panduan page (sidebar → "Panduan
 * Penggunaan"). Kept as a quick-access button in the topbar so staff don't
 * have to open the mobile drawer just to find help.
 */
export function PanduanButton() {
  return (
    <Link href="/panduan" className="btn btn-secondary btn-sm" aria-label="Panduan penggunaan">
      <HelpCircle size={16} />
      <span className="hidden sm:inline">Panduan Penggunaan</span>
    </Link>
  )
}
