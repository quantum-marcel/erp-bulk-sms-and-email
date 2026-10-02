import { defineStore } from 'pinia'
import { ref } from 'vue'
import { post } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import type { CampaignPreviewResponse } from '@/types/backend'
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

  // Interactive pages stay separate from the unfiltered counts used by compose.
  async function previewPage(domainId: number | null, limit = 20, offset = 0, q = '', campaignId?: number): Promise<PreviewResponse | null> {
    const revision = scopeRevision
    const payload = { limit: Math.min(Math.max(Math.trunc(limit), 1), MAX_PREVIEW_LIMIT), offset: Math.max(0, Math.trunc(offset)), q: q.trim().slice(0, 255) || undefined }
    if (campaignId != null) {
      const res = await post<CampaignPreviewResponse>(`/preview/campaign/${campaignId}`, payload)
      if (revision !== scopeRevision) return null
      return { domain_id: res.domain_id ?? 0, domain_name: res.campaign_name, total_matched: res.total, sample: res.sample, limit: res.limit, offset: res.offset }
    }
    if (domainId == null) return null
    const res = await post<PreviewResponse>('/preview/', { ...payload, domain_id: domainId })
    return revision === scopeRevision ? res : null
  }

  function invalidate(domainId: number) {
    delete results.value[domainId]
  }

  function reset() {
    scopeRevision++
    results.value = {}
    loadingIds.value.clear()
  }

  return { results, isLoading, preview, previewPage, invalidate, reset }
})
