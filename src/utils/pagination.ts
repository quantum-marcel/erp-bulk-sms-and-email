export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

type Get = <T>(url: string, params?: object) => Promise<T>

export async function fetchPage<T>(get: Get, url: string, params: Record<string, unknown> = {}): Promise<Page<T>> {
  const limit = Math.min(200, Math.max(1, Math.trunc(Number(params.limit) || 20)))
  const offset = Math.max(0, Math.trunc(Number(params.offset) || 0))
  const page = await get<Page<T>>(url, { ...params, limit, offset })
  if (!page || !Array.isArray(page.items) || !Number.isInteger(page.total) || page.total < 0 ||
      page.offset !== offset || !Number.isInteger(page.limit) || page.limit < 1 || page.limit > 200) {
    throw new Error('Invalid paginated response from ' + url)
  }
  return page
}

// Complete lookup caches and explicit exports can still request every page.
export async function fetchAllPages<T>(get: Get, url: string, params: Record<string, unknown> = {}, isCurrent = () => true): Promise<T[]> {
  const items: T[] = []
  let offset = typeof params.offset === 'number' ? params.offset : 0
  const limit = typeof params.limit === 'number' ? Math.min(200, Math.max(1, params.limit)) : 200
  while (isCurrent()) {
    const page = await get<Page<T> | T[]>(url, { ...params, limit, offset })
    if (!isCurrent()) return []
    // Also accept array responses during a rolling backend upgrade.
    if (Array.isArray(page)) return items.concat(page)
    if (!page || !Array.isArray(page.items) || !Number.isInteger(page.total) || page.total < 0 || page.offset !== offset) {
      throw new Error('Invalid paginated response from ' + url)
    }
    items.push(...page.items)
    offset += page.items.length
    if (offset >= page.total) return items
    if (!page.items.length) throw new Error('Incomplete paginated response from ' + url)
  }
  return []
}
