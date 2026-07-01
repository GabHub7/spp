'use client'

import { Printer, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function PrintActions() {
  const router = useRouter()
  return (
    <div className="no-print flex items-center gap-2">
      <button onClick={() => router.push('/pembayaran')} className="btn btn-secondary btn-sm">
        <ArrowLeft size={16} /> Kembali
      </button>
      <button onClick={() => window.print()} className="btn btn-primary btn-sm">
        <Printer size={16} /> Cetak / Simpan PDF
      </button>
    </div>
  )
}
