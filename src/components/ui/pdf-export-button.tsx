'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  columns: string[]
  rows: (string | number)[][]
  filename: string
  label?: string
}

/** Generates a styled PDF client-side via jsPDF + autotable (lazy-loaded). */
export function PdfExportButton({ title, subtitle, columns, rows, filename, label = 'Export PDF' }: Props) {
  const [busy, setBusy] = useState(false)

  async function exportPdf() {
    setBusy(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: rows[0] && rows[0].length > 5 ? 'landscape' : 'portrait' })

      doc.setFontSize(14)
      doc.text(title, 14, 16)
      if (subtitle) {
        doc.setFontSize(10)
        doc.setTextColor(120)
        doc.text(subtitle, 14, 22)
      }

      autoTable(doc, {
        head: [columns],
        body: rows.map((r) => r.map((c) => String(c))),
        startY: subtitle ? 27 : 22,
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [209, 31, 45], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 243, 241] },
        margin: { left: 14, right: 14 },
      })

      doc.save(filename)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button onClick={exportPdf} className="btn btn-secondary btn-sm" disabled={busy || rows.length === 0}>
      <FileDown size={16} /> {busy ? 'Menyiapkan…' : label}
    </button>
  )
}
