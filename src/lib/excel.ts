import 'server-only'
import * as XLSX from 'xlsx'

/** Builds an .xlsx file (as a Buffer) from an array of row objects. */
export function rowsToXlsx(
  rows: Record<string, unknown>[],
  sheetName = 'Sheet1'
): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/** Parses the first worksheet of an uploaded .xlsx/.csv into row objects. */
export function xlsxToRows(data: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(data, { type: 'array' })
  const first = workbook.SheetNames[0]
  if (!first) return []
  const sheet = workbook.Sheets[first]
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
}

/** Standard headers for the Excel response. */
export function xlsxHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  }
}
