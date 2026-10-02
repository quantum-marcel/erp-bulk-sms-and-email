export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const pushField = () => { row.push(field); field = '' }
  const pushRow = () => { pushField(); rows.push(row); row = [] }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false }
      else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') pushField()
    else if (ch === '\n') pushRow()
    else if (ch !== '\r') field += ch
  }
  if (field || row.length) pushRow()
  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const looksLikePhone = (v: string) => /^[+\d][\d\s-]{5,}$/.test(v)

// Finds the email/phone column by header name, falling back to whichever
// column's values look right, and only skips row 0 if it reads as a header.
export function extractCsvColumn(rows: string[][], kind: 'email' | 'phone'): string[] {
  if (!rows.length) return []
  const test = kind === 'email' ? looksLikeEmail : looksLikePhone
  const keywords = kind === 'email' ? ['email', 'mail'] : ['phone', 'mobile', 'tel', 'msisdn', 'contact', 'number']
  const header = rows[0].map(h => h.trim().toLowerCase())
  let colIndex = header.findIndex(h => keywords.some(k => h.includes(k)))
  if (colIndex === -1) {
    colIndex = rows[0].findIndex((_, i) => rows.slice(1, 6).some(r => test((r[i] || '').trim())))
    if (colIndex === -1) colIndex = 0
  }
  const dataRows = test((rows[0][colIndex] || '').trim()) ? rows : rows.slice(1)
  return dataRows.map(r => (r[colIndex] || '').trim()).filter(Boolean)
}

