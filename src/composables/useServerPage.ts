import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { get } from '@/utils/http'
import { fetchPage, type Page } from '@/utils/pagination'

/** View-owned pages never replace the complete lookup caches in stores. */
export function useServerPage<T>(url: () => string | null, filters: () => Record<string, unknown> = () => ({}), initialSize = 20) {
  const items = shallowRef<T[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(initialSize)
  const search = ref('')
  const query = ref('')
  const loading = ref(false)
  const error = ref('')
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  let revision = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  async function load() {
    if (disposed) return
    const current = ++revision
    const path = url()
    items.value = []; error.value = ''
    if (!path) { total.value = 0; loading.value = false; return }
    loading.value = true
    try {
      const result: Page<T> = await fetchPage<T>(get, path, {
        ...filters(), q: query.value || undefined,
        limit: pageSize.value, offset: (page.value - 1) * pageSize.value,
      })
      if (current !== revision) return
      // Honor a smaller server page size so later offsets cannot skip rows.
      if (result.limit !== pageSize.value) { pageSize.value = result.limit; return }
      total.value = result.total
      // Deleting the last row on a page can leave its offset outside the result.
      if (page.value > totalPages.value) { page.value = totalPages.value; return }
      items.value = result.items
    } catch (e) {
      if (current === revision) { total.value = 0; error.value = e instanceof Error ? e.message : 'Could not load results.' }
    } finally { if (current === revision) loading.value = false }
  }
  watch(search, value => {
    clearTimeout(timer)
    revision++
    items.value = []; loading.value = true
    timer = setTimeout(() => {
      const next = (value || '').trim().slice(0, 255)
      if (query.value === next) void load()
      else query.value = next
    }, 300)
  }, { flush: 'sync' })
  watch([url, filters, query, pageSize], () => { page.value = 1 }, { flush: 'sync', deep: true })
  watch([url, filters, query, page, pageSize], load, { immediate: true, deep: true })
  onBeforeUnmount(() => { disposed = true; revision++; clearTimeout(timer) })
  return { items, total, page, pageSize, search, loading, error, totalPages, load }
}
