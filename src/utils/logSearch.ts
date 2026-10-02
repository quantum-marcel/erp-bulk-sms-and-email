// Search every value returned by the API, including nested recipient details.
export function matchesLogSearch(value: unknown, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  if (value == null) return false
  if (typeof value === 'object') return Object.values(value).some(item => matchesLogSearch(item, needle))
  const text = String(value).toLowerCase()
  if (text.includes(needle)) return true
  if (/^[+\d\s().-]+$/.test(needle) && /^[+\d\s().-]+$/.test(text)) {
    const digits = needle.replace(/\D/g, '')
    return digits.length >= 4 && text.replace(/\D/g, '').includes(digits)
  }
  return false
}
