'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { generateBills } from './actions'

export function GenerateBillsButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function run() {
    if (!confirm('Buat tagihan SPP otomatis untuk semua siswa aktif pada tahun ajaran aktif?')) return
    setMsg(null)
    start(async () => {
      const res = await generateBills()
      if (res.error) setMsg(res.error)
      else {
        setMsg(`${res.created ?? 0} tagihan baru dibuat.`)
        router.refresh()
      }
    })
  }

  return (
    <>
      {msg && (
        <span className="badge status-success"><CheckCircle2 size={13} /> {msg}</span>
      )}
      <button onClick={run} className="btn btn-primary btn-sm" disabled={pending}>
        <RefreshCw size={16} className={pending ? 'animate-[spin_0.8s_linear_infinite]' : ''} />
        {pending ? 'Memproses…' : 'Generate Tagihan'}
      </button>
    </>
  )
}
