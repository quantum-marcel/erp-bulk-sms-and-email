import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, post, patch, del } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import type { Campaign, CreateCampaignPayload, CampaignLog, DispatchResult } from '@/types/sms'
import type { ApiCampaignLog } from '@/types/api'

export const useCampaignStore = defineStore('campaign', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const campaigns    = ref<Campaign[]>([])
  const currentCampaign = ref<Campaign | null>(null)
  const currentLogs  = ref<CampaignLog[]>([])
  const isLoading    = ref(false)

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
    if (!force && campaigns.value.length) return
    const { run } = useApiCall()
    isLoading.value = true
    const res = await run(() => get<Campaign[]>('/campaigns/'), { silent: true })
    if (res) campaigns.value = res
    isLoading.value = false
  }

  // ── Fetch single campaign ──────────────────────────────────────────────
  async function fetchOne(id: number) {
    const { run } = useApiCall()
    const res = await run(() => get<Campaign>(`/campaigns/${id}`), { silent: true })
    if (res) currentCampaign.value = res
    return res
  }

  // ── Create campaign (saves as draft) ──────────────────────────────────
  async function create(payload: CreateCampaignPayload): Promise<Campaign | null> {
    const { run } = useApiCall()
    const res = await run(
      () => post<Campaign>('/campaigns/', payload),
      { success: 'Campaign saved as draft' }
    )
    if (res) campaigns.value.unshift(res)
    return res
  }

  // ── Update campaign (edit draft) ───────────────────────────────────────
  async function update(id: number, payload: Partial<CreateCampaignPayload>): Promise<Campaign | null> {
    const { run } = useApiCall()
    const res = await run(
      () => patch<Campaign>(`/campaigns/${id}`, payload),
      { success: 'Campaign updated' }
    )
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
  }

  // ── Send campaign ──────────────────────────────────────────────────────
  // Dispatch is async: this only moves the campaign to 'running'. The final
  // status (completed / completed_with_failures / failed) arrives later via
  // the Quantum SMS webhook, so we re-fetch the full record rather than
  // trusting the DispatchResult shape returned here.
  async function send(id: number): Promise<boolean> {
    const { run } = useApiCall()
    const res = await run(
      () => post<DispatchResult>(`/campaigns/${id}/send`, {}),
      { success: 'Campaign sent successfully!' }
    )
    if (res) await syncCampaign(id)
    return !!res
  }

  // ── Retry failed ───────────────────────────────────────────────────────
  async function retryFailed(id: number): Promise<boolean> {
    const { run } = useApiCall()
    const res = await run(
      () => post<DispatchResult>(`/campaigns/${id}/retry`, {}),
      { success: 'Retrying failed recipients…' }
    )
    if (res) await syncCampaign(id)
    return !!res
  }

  // ── Fetch campaign logs ────────────────────────────────────────────────
  async function fetchLogs(id: number, limit = 200, offset = 0) {
    const { run } = useApiCall()
    const res = await run(
      () => get<ApiCampaignLog[]>(`/campaigns/${id}/logs`, { limit, offset }),
      { silent: true }
    )
    if (res) {
      // Map API response shape → internal CampaignLog shape
      currentLogs.value = res.map(l => ({
        id: l.id,
        campaign_id: id,
        recipient: l.recipient_ref,
        channel: l.channel as 'email' | 'sms',
        status: l.success ? 'sent' as const : 'failed' as const,
        error: l.error_message ?? undefined,
        sent_at: l.sent_at,
        delivery_status: l.delivery_status,
        retry_count: l.retry_count,
        retry_pending: l.retry_pending,
        quantum_message_id: l.quantum_message_id ?? undefined,
        delivered_at: l.delivered_at ?? undefined,
      }))
    }
    return res
  }

  // ── Delete (draft only) ────────────────────────────────────────────────
  async function remove(id: number) {
    const { run } = useApiCall()
    await run(
      () => del(`/campaigns/${id}`),
      { success: 'Campaign deleted' }
    )
    campaigns.value = campaigns.value.filter(c => c.id !== id)
    if (currentCampaign.value?.id === id) currentCampaign.value = null
  }

  // ── Clear logs (e.g. before navigating to a new campaign detail) ───────
  function clearLogs() {
    currentLogs.value = []
  }

  // ── Set current for editing ────────────────────────────────────────────
  function setCurrent(campaign: Campaign | null) {
    currentCampaign.value = campaign
  }

  function reset() {
    campaigns.value = []
    currentCampaign.value = null
    currentLogs.value = []
  }

  return {
    campaigns, currentCampaign, currentLogs, isLoading,
    drafts, sent, failed, draftCount, failedCount,
    fetchAll, fetchOne, create, update, send, retryFailed, fetchLogs, remove, setCurrent, clearLogs, reset,
  }
})
