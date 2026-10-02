import { getLogDisplayStatus, canRetryLog, matchesLogStatus } from '@/utils/logStatus'
import { fetchAllPages, fetchPage } from '@/utils/pagination'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, post, patch } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import { useUiStore } from '@/stores/ui'
import type { Campaign, CreateCampaignPayload, CampaignLog, DispatchResult, SmsProvider } from '@/types/sms'
import type { ApiCampaignLog } from '@/types/api'

export const useCampaignStore = defineStore('campaign', () => {
  let scopeRevision = 0
  // ── State ──────────────────────────────────────────────────────────────
  const campaigns    = ref<Campaign[]>([])
  const currentCampaign = ref<Campaign | null>(null)
  const currentLogs  = ref<CampaignLog[]>([])
  const logsTotal = ref(0)
  let logRequest = 0
  const isLoading    = ref(false)
  const sendingIds = ref<number[]>([])
  const sendErrors = ref<Record<number, string>>({})

  // ── Derived lists ───────────────────────────────────────────────────────
  const drafts   = computed(() => campaigns.value.filter(c => c.status === 'draft'))
  // Dispatched campaigns (in progress or finished, regardless of outcome)
  const sent     = computed(() => campaigns.value.filter(c => c.status === 'running' || c.status === 'completed' || c.status === 'completed_with_failures'))
  // Campaigns with at least some failures — includes fully-failed and partially-failed
  const failed   = computed(() => campaigns.value.filter(c => c.status === 'failed' || c.status === 'completed_with_failures'))
  const draftCount  = computed(() => drafts.value.length)
  const failedCount = computed(() => failed.value.length)

  // ── Fetch all campaigns ────────────────────────────────────────────────
  async function fetchAll(force = false) {
    const revision = scopeRevision
    if (!force && campaigns.value.length) return
    const { run } = useApiCall()
    isLoading.value = true
    const res = await run(() => fetchAllPages<Campaign>(get, '/campaigns/', {}, () => revision === scopeRevision), { silent: true })
    if (revision !== scopeRevision) return
    if (res) campaigns.value = res
    isLoading.value = false
  }

  // ── Fetch single campaign ──────────────────────────────────────────────
  async function fetchOne(id: number) {
    const revision = scopeRevision
    const { run } = useApiCall()
    const res = await run(() => get<Campaign>(`/campaigns/${id}`), { silent: true })
    if (revision !== scopeRevision) return null
    if (res) currentCampaign.value = res
    return res
  }

  // ── Create campaign (saves as draft) ──────────────────────────────────
  // `notify` is turned off when this is just an intermediate step of a
  // send flow (see compose.vue doSend) — the user only cares about the
  // final send outcome, not the implicit draft save that precedes it.
  async function create(payload: CreateCampaignPayload, notify = true): Promise<Campaign | null> {
    const revision = scopeRevision
    const { run } = useApiCall()
    const res = await run(
      () => post<Campaign>('/campaigns/', payload),
      notify ? { success: 'Campaign saved as draft' } : undefined
    )
    if (revision !== scopeRevision) return null
    if (res) campaigns.value.unshift(res)
    return res
  }

  // ── Update campaign (edit draft) ───────────────────────────────────────
  async function update(id: number, payload: Partial<CreateCampaignPayload>, notify = true): Promise<Campaign | null> {
    const revision = scopeRevision
    const { run } = useApiCall()
    const res = await run(
      () => patch<Campaign>(`/campaigns/${id}`, payload),
      notify ? { success: 'Campaign updated' } : undefined
    )
    if (revision !== scopeRevision) return null
    if (res) {
      const idx = campaigns.value.findIndex(c => c.id === id)
      if (idx !== -1) campaigns.value[idx] = res
      if (currentCampaign.value?.id === id) currentCampaign.value = res
    }
    return res
  }

  // ── Sync a campaign's full record into both currentCampaign and the list ──
  async function syncCampaign(id: number) {
    const res = await fetchOne(id)
    if (res) {
      const idx = campaigns.value.findIndex(c => c.id === id)
      if (idx !== -1) campaigns.value[idx] = res
    }
    return res
  }

  // ── Send campaign ──────────────────────────────────────────────────────
  async function send(id: number): Promise<boolean> {
    const revision = scopeRevision
    if (sendingIds.value.includes(id)) return false
    sendingIds.value.push(id)
    delete sendErrors.value[id]
    const ui = useUiStore()
    try {
      // Re-check before dispatching, including after an earlier timeout.
      const before = await syncCampaign(id)
      if (revision !== scopeRevision) return false
      if (!before) {
        sendErrors.value[id] = 'Could not verify campaign status. Refresh before trying again.'
        ui.toast(sendErrors.value[id], 'error')
        return false
      }
      if (before.status !== 'draft') {
        ui.toast('This campaign is no longer a draft. Check its delivery status.', 'info')
        return false
      }
      if (before.channel === 'sms' || before.channel === 'both') {
        if (!before.sms_provider) {
          ui.toast('Edit this draft and select an SMS provider before sending.', 'warning')
          return false
        }
        try {
          const providers = await get<SmsProvider[]>('/sms/providers')
          if (!providers.some(provider => provider.id === before.sms_provider && provider.configured)) {
            ui.toast('The selected SMS provider is unavailable. Edit this draft to choose another.', 'warning')
            return false
          }
        } catch {
          ui.toast('Could not verify SMS provider availability. Try again before sending.', 'error')
          return false
        }
      }
      if (revision !== scopeRevision) return false
      let res: DispatchResult
      try {
        res = await post<DispatchResult>(`/campaigns/${id}/send`, {})
      } catch (error) {
        if (revision !== scopeRevision) return false
        await syncCampaign(id)
        if (revision !== scopeRevision) return false
        const reason = error instanceof Error ? error.message : 'Request failed'
        sendErrors.value[id] = `Send could not be confirmed: ${reason}. Check campaign status before trying again.`
        ui.toast(sendErrors.value[id], 'error')
        return false
      }
      if (revision !== scopeRevision) return false
      const campaign = await syncCampaign(id)
      if (revision !== scopeRevision) return false
      // A queued job may still be a draft until the worker starts.
      if (campaign?.status === 'draft' && res.job_id == null && !['queued', 'scheduled', 'running'].includes(res.status)) {
        sendErrors.value[id] = `Campaign is still a draft. ${res.message || 'Sending has not started.'}`
        ui.toast(sendErrors.value[id], 'warning')
        return false
      }
      const status = campaign?.status === 'draft' ? res.status : campaign?.status || res.status
      switch (status) {
        case 'completed':
          ui.toast('Campaign sent successfully!', 'success')
          break
        case 'completed_with_failures':
          ui.toast('Campaign sent, with some failures', 'warning')
          break
        case 'failed':
          sendErrors.value[id] = res.message || 'Campaign failed to send. Check delivery logs.'
          ui.toast(sendErrors.value[id], 'error')
          return false
        case 'running':
          ui.toast('Campaign is sending…', 'info')
          break
        default:
          ui.toast(res.message || 'Send request accepted. Check campaign status for progress.', 'info')
      }
      return true
    } finally {
      if (revision === scopeRevision) sendingIds.value = sendingIds.value.filter(value => value !== id)
    }
  }

  // ── Retry failed ───────────────────────────────────────────────────────
  const retryingCampaignIds = ref<number[]>([])
  async function retryFailed(id: number, logId?: number): Promise<boolean> {
    if (retryingCampaignIds.value.includes(id)) return false
    if (logId == null && currentLogs.value.some(log => log.campaign_id === id && log.retry_pending)) return false
    if (logId != null) {
      const log = currentLogs.value.find(item => item.id === logId && item.campaign_id === id)
      if (!log || !canRetryLog(log)) return false
    }
    const revision = scopeRevision
    retryingCampaignIds.value.push(id)
    try {
      const { run } = useApiCall()
      const path = logId == null ? `/campaigns/${id}/retry` : `/campaigns/${id}/logs/${logId}/retry`
      const res = await run(() => post<DispatchResult>(path, {}))
      if (!res || revision !== scopeRevision) return false
      const accepted = ['queued', 'running', 'pending', 'accepted', 'retrying'].includes(res.status) || (res.status !== 'failed' && res.job_id != null)
      if (!accepted) {
        useUiStore().toast(res.message || 'Retry was not accepted.', 'warning')
        return false
      }
      currentLogs.value.forEach(log => {
        if (log.campaign_id === id && (logId == null || log.id === logId) && getLogDisplayStatus(log) === 'failed') log.retry_pending = true
      })
      await syncCampaign(id)
      if (revision !== scopeRevision) return false
      useUiStore().toast(res.message || 'Retry queued.', 'info')
      return true
    } finally {
      if (revision === scopeRevision) retryingCampaignIds.value = retryingCampaignIds.value.filter(value => value !== id)
    }
  }

  function mapLog(l: ApiCampaignLog, id: number): CampaignLog {
    return {
      raw: { ...l },
      contact_value: l.contact_value,
      id: l.id,
      campaign_id: id,
      recipient: l.contact_value || l.recipient_ref || String(l.id),
      channel: l.channel as 'email' | 'sms',
      status: l.success ? 'sent' as const : 'failed' as const,
      error: l.error_message ?? undefined,
      sent_at: l.sent_at,
      delivery_status: l.delivery_status,
      retry_count: l.retry_count,
      retry_pending: l.retry_pending,
      quantum_message_id: l.quantum_message_id ?? undefined,
      delivered_at: l.delivered_at ?? undefined,
    }
  }

  async function searchLogs(id: number, query: string): Promise<CampaignLog[]> {
    const revision = scopeRevision
    const result = await fetchAllPages<ApiCampaignLog>(get, `/campaigns/${id}/logs`, { q: query }, () => revision === scopeRevision)
    return revision === scopeRevision ? result.map(log => mapLog(log, id)) : []
  }

  // ── Fetch campaign logs ────────────────────────────────────────────────
  async function fetchLogs(id: number, limit = 20, offset = 0, filters: Record<string, unknown> = {}) {
    const revision = scopeRevision
    const { run } = useApiCall()
    const request = ++logRequest
    const res = await run(
      async () => {
        const { display_status, ...params } = filters
        if (!display_status || display_status === 'all') {
          return fetchPage<ApiCampaignLog>(get, `/campaigns/${id}/logs`, { ...params, limit, offset })
        }
        // The API has no unified status filter. Match the same channel-aware
        // status as the badges across every page before paginating the result.
        const rows = await fetchAllPages<ApiCampaignLog>(get, `/campaigns/${id}/logs`, params,
          () => revision === scopeRevision && request === logRequest)
        const matching = rows.filter(row => matchesLogStatus(mapLog(row, id), String(display_status)))
        return { items: matching.slice(offset, offset + limit), total: matching.length, limit, offset }
      },
      { silent: true }
    )
    if (revision !== scopeRevision) return null
    if (request !== logRequest) return null
    if (res) {
      logsTotal.value = res.total
      // Map API response shape → internal CampaignLog shape
      currentLogs.value = res.items.map(l => mapLog(l, id))

    }
    return res
  }

  // ── Clear logs (e.g. before navigating to a new campaign detail) ───────
  function clearLogs() {
    logRequest++
    logsTotal.value = 0
    currentLogs.value = []
  }

  // ── Set current for editing ────────────────────────────────────────────
  function setCurrent(campaign: Campaign | null) {
    currentCampaign.value = campaign
  }

  function reset() {
    scopeRevision++
    clearLogs()
    retryingCampaignIds.value = []
    isLoading.value = false
    campaigns.value = []
    currentCampaign.value = null
    currentLogs.value = []
    sendErrors.value = {}
    sendingIds.value = []
  }

  return {
    campaigns, currentCampaign, currentLogs, logsTotal, isLoading, sendingIds, sendErrors,
    drafts, sent, failed, draftCount, failedCount,
    fetchAll, fetchOne, create, update, send, retryFailed, retryingCampaignIds, fetchLogs, searchLogs, setCurrent, clearLogs, reset,
  }
})
