import { defineStore } from 'pinia'
import { ref } from 'vue'
import { post } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import type { PreviewResponse } from '@/types/sms'

const MAX_PREVIEW_LIMIT = 200

export const usePreviewStore = defineStore('preview', () => {
  let scopeRevision = 0
  // ── State ──────────────────────────────────────────────────────────────────
  const results = ref<Record<number, PreviewResponse>>({})   // keyed by domain_id
  const loadingIds = ref<Set<number>>(new Set())

  function isLoading(domainId: number): boolean {
    return loadingIds.value.has(domainId)
  }

  // ── Preview a domain's matched recipients ──────────────────────────────────
  // `silent` is on by default since compose.vue/RecipientPicker trigger this
  // passively as soon as a list is picked — a toast on every failed passive
  // fetch would be noisy. The explicit "Preview" button on mailing-lists.vue
  // passes silent: false so the real backend error is visible when the user
  // asked for it directly.
  async function preview(domainId: number, limit = 20, silent = true): Promise<PreviewResponse | null> {
    const revision = scopeRevision
    const { run } = useApiCall()
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), MAX_PREVIEW_LIMIT)
    loadingIds.value.add(domainId)
    try {
      const res = await run(
        () => post<PreviewResponse>('/preview/', { domain_id: domainId, limit: safeLimit }),
        { silent }
      )
      if (revision !== scopeRevision) return null
      if (res) results.value[domainId] = res
      return res
    } finally {
      if (revision === scopeRevision) loadingIds.value.delete(domainId)
    }
  }

  function invalidate(domainId: number) {
    delete results.value[domainId]
  }

  function reset() {
    scopeRevision++
    results.value = {}
    loadingIds.value.clear()
  }

  return { results, isLoading, preview, invalidate, reset }
})
