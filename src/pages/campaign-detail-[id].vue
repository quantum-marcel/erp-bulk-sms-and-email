<template>
  <div>
    <!-- Back + header -->
    <div class="d-flex align-start ga-3 mb-6 flex-wrap">
      <v-btn icon variant="text" size="small" @click="router.push('/campaigns')" style="flex-shrink:0;margin-top:2px">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div class="flex-grow-1" style="min-width:0">
        <div class="d-flex align-center ga-2 flex-wrap">
          <h2 class="font-weight-bold" style="font-size:clamp(17px,4vw,22px)">
            {{ campaign?.name || 'Campaign' }}
          </h2>
          <v-chip v-if="campaign" size="small" :color="statusColor" label variant="tonal">
            <v-icon start size="12">{{ statusIcon }}</v-icon>
            {{ effectiveStatus }}
          </v-chip>
          <v-chip v-if="campaign" size="small" :color="channelColor" label variant="tonal">
            <v-icon start size="12">{{ channelIcon }}</v-icon>
            {{ campaign.channel.toUpperCase() }}
          </v-chip>
        </div>
        <p class="text-medium-emphasis text-body-2 mt-1">
          <span v-if="campaign && authStore.isAdmin">{{ authStore.companyName(campaign.company_id) }} · </span>Created {{ campaign ? formatDate(campaign.created_at) : '…' }}
        </p>

        <!-- Actions (moved under title so they wrap nicely on mobile) -->
        <div v-if="campaign" class="d-flex ga-2 flex-wrap mt-3">
          <v-btn v-if="campaign.status === 'draft'" color="primary" variant="tonal"
            prepend-icon="mdi-file-document-edit-outline" rounded="xl" size="small"
            :to="`/compose?edit=${campaign.id}`">
            Edit Draft
          </v-btn>
          <v-btn
            v-if="campaign.status === 'draft'"
            color="success"
            prepend-icon="mdi-send-outline"
            rounded="xl"
            elevation="0"
            size="small"
            :loading="sending"
            @click="confirmSend = true"
          >
            Send Now
          </v-btn>
          <v-btn
            v-if="effectiveFailedCount > 0"
            color="warning"
            prepend-icon="mdi-refresh"
            rounded="xl"
            elevation="0"
            size="small"
            :loading="retrying"
            @click="handleRetry"
          >
            Retry Failed
          </v-btn>
          <v-btn
            v-if="effectiveStatus === 'completed' || effectiveStatus === 'completed_with_failures'"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-content-copy"
            rounded="xl"
            elevation="0"
            size="small"
            @click="router.push(`/compose?clone=${campaign.id}`)"
          >
            Duplicate
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <v-alert v-if="campaign && campaignStore.sendErrors[campaign.id]" type="error" variant="tonal" class="mb-4">
      {{ campaignStore.sendErrors[campaign.id] }}
    </v-alert>
    <div v-if="loading" class="d-flex justify-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Not found -->
    <div v-else-if="!campaign" class="text-center py-16">
      <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-alert-circle-outline</v-icon>
      <p class="font-weight-semibold text-h6 mb-1">Campaign not found</p>
      <p class="text-medium-emphasis text-body-2 mb-4">This campaign may have been deleted.</p>
      <v-btn to="/campaigns" color="primary" rounded="xl" elevation="0" prepend-icon="mdi-arrow-left">
        Back to Campaigns
      </v-btn>
    </div>

    <v-row v-else>
      <!-- ── LEFT: Content ── -->
      <v-col cols="12" lg="7">

        <!-- SMS Body -->
        <v-card
          v-if="campaign.channel === 'sms' || campaign.channel === 'both'"
          rounded="xl" elevation="0" class="pa-5 mb-4 ng-card"
        >
          <div class="section-label mb-4">
            <v-icon size="16" color="success" class="mr-1">mdi-message-text-outline</v-icon>
            SMS Body
          </div>
          <div class="sms-preview pa-4 rounded-lg">
            <p class="text-body-2" style="white-space: pre-wrap; line-height: 1.7">{{ campaign.sms_body }}</p>
          </div>
          <div class="d-flex align-center ga-3 mt-3">
            <v-chip size="x-small" color="secondary-darken-2" label variant="tonal">
              {{ campaign.sms_body?.length || 0 }} chars
            </v-chip>
            <v-chip size="x-small" color="secondary-darken-2" label variant="tonal">
              {{ Math.ceil((campaign.sms_body?.length || 0) / 160) || 1 }} part{{ Math.ceil((campaign.sms_body?.length || 0) / 160) !== 1 ? 's' : '' }}
            </v-chip>
          </div>
        </v-card>

        <!-- Email Content -->
        <v-card
          v-if="campaign.channel === 'email' || campaign.channel === 'both'"
          rounded="xl" elevation="0" class="pa-5 mb-4 ng-card"
        >
          <div class="section-label mb-4">
            <v-icon size="16" color="info" class="mr-1">mdi-email-outline</v-icon>
            Email
          </div>
          <label class="field-label d-block mb-1">Subject</label>
          <p class="text-body-2 font-weight-medium mb-4">{{ campaign.subject || '' }}</p>
          <label class="field-label d-block mb-2">Body</label>
          <div class="email-preview pa-4 rounded-lg" v-html="campaign.email_body" />
        </v-card>

        <!-- Logs -->
        <v-card rounded="xl" elevation="0" class="pa-5 ng-card">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="section-label">
              <v-icon size="16" class="mr-1">mdi-text-box-search-outline</v-icon>
              Delivery Logs
            </div>
            <v-btn
              size="x-small" variant="tonal" color="primary"
              prepend-icon="mdi-refresh"
              :loading="loadingLogs"
              @click="loadLogs"
            >
              Refresh
            </v-btn>
          </div>

          <div v-if="loadingLogs" class="d-flex justify-center py-8">
            <v-progress-circular indeterminate color="primary" size="24" />
          </div>

          <div v-else-if="campaignStore.currentLogs.length === 0" class="text-center py-8">
            <v-icon size="40" color="medium-emphasis" class="mb-2">mdi-text-box-outline</v-icon>
            <p class="text-medium-emphasis text-body-2">
              {{ campaign.status === 'draft' ? 'No logs yet — campaign has not been sent.' : 'No delivery logs found.' }}
            </p>
          </div>

          <!-- Log search -->
          <div v-else>
            <v-text-field
              v-model="logSearch"
              placeholder="Search recipient..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              rounded="xl"
              hide-details
              clearable
              class="mb-3"
            />

            <!-- Summary row -->
            <div class="d-flex ga-3 mb-3 flex-wrap">
              <v-chip size="small" :color="LOG_STATUS_META.delivered.color" variant="tonal" label>
                <v-icon start size="12">{{ LOG_STATUS_META.delivered.icon }}</v-icon>
                {{ deliveredLogs.length }} delivered
              </v-chip>
              <v-chip v-if="acceptedLogs.length" size="small" color="info" variant="tonal" label>{{ acceptedLogs.length }} accepted</v-chip>
              <v-chip v-if="pendingLogs.length > 0" size="small" :color="LOG_STATUS_META.pending.color" variant="tonal" label>
                <v-icon start size="12">{{ LOG_STATUS_META.pending.icon }}</v-icon>
                {{ pendingLogs.length }} pending
              </v-chip>
              <v-chip size="small" :color="LOG_STATUS_META.failed.color" variant="tonal" label>
                <v-icon start size="12">{{ LOG_STATUS_META.failed.icon }}</v-icon>
                {{ failedLogs.length }} failed
              </v-chip>
            </div>

            <!-- Filter tabs -->
            <div class="d-flex ga-2 mb-3 flex-wrap">
              <button
                v-for="f in logFilters" :key="f.value"
                class="log-filter-btn"
                :class="{ 'log-filter-btn--active': logFilter === f.value }"
                @click="logFilter = f.value"
              >
                {{ f.label }}
              </button>
            </div>

            <v-virtual-scroll
              :items="filteredLogs"
              :height="filteredLogs.length <= 8 ? filteredLogs.length * 150 : 520"
              item-height="150"
            >
              <template #default="{ item: log }">
                <div
                  class="log-row pa-3 rounded-lg mb-1"
                  :class="{
                    'log-row--failed':    getLogDisplayStatus(log) === 'failed',
                    'log-row--delivered': getLogDisplayStatus(log) === 'delivered',
                    'log-row--pending':   getLogDisplayStatus(log) === 'pending',
                  }"
                >
                  <div class="d-flex align-center ga-3">
                    <v-icon size="18" :color="LOG_STATUS_META[getLogDisplayStatus(log)].color">
                      {{ LOG_STATUS_META[getLogDisplayStatus(log)].icon }}
                    </v-icon>
                    <div style="flex:1; min-width:0">
                      <p class="text-body-2 font-weight-medium text-truncate">{{ log.recipient }}</p>
                      <div class="d-flex align-center gap-log flex-wrap mt-1">
                        <span class="text-caption text-medium-emphasis">
                          {{ log.channel.toUpperCase() }} · {{ formatDate(log.sent_at) }}
                        </span>
                        <span v-if="log.retry_count && log.retry_count > 0" class="text-caption text-warning">
                          · retried {{ log.retry_count }}×
                        </span>
                      </div>
                      <p v-if="log.error" class="text-caption text-error mt-1" style="white-space:normal;line-height:1.4">
                        {{ log.error }}
                      </p>
                    </div>
                    <!-- Single consolidated status chip -->
                    <v-chip
                      size="x-small"
                      :color="LOG_STATUS_META[getLogDisplayStatus(log)].color"
                      label
                      variant="tonal"
                      style="flex-shrink:0"
                    >
                      {{ LOG_STATUS_META[getLogDisplayStatus(log)].label }}
                    </v-chip>
                  </div>
                  <div v-if="log.delivered_at" class="text-caption text-medium-emphasis mt-1 ml-7">
                    <v-icon size="10" class="mr-1">mdi-check-all</v-icon>
                    Delivered {{ formatDate(log.delivered_at) }}
                  </div>
                </div>
              </template>
            </v-virtual-scroll>

            <!-- Pagination hint -->
            <div v-if="campaignStore.currentLogs.length >= 200" class="text-caption text-medium-emphasis text-center mt-3">
              Showing first 200 logs.
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- ── RIGHT: Stats + Meta ── -->
      <v-col cols="12" lg="5">

        <!-- Stats -->
        <v-card rounded="xl" elevation="0" class="pa-5 mb-4 ng-card">
          <p class="font-weight-semibold text-body-1 mb-4">Statistics</p>
          <div class="d-flex flex-column ga-3">
            <div class="stat-row">
              <div class="d-flex align-center ga-2">
                <v-icon size="16" color="medium-emphasis">mdi-account-multiple-outline</v-icon>
                <span class="text-body-2 text-medium-emphasis">Total Recipients</span>
              </div>
              <span class="font-weight-bold text-body-1">{{ (campaign.total_recipients || 0).toLocaleString() }}</span>
            </div>
            <v-divider />
            <div class="stat-row">
              <div class="d-flex align-center ga-2">
                <v-icon size="16" color="success">mdi-check-circle-outline</v-icon>
                <span class="text-body-2 text-medium-emphasis">Sent</span>
              </div>
              <span class="font-weight-bold text-body-1 text-success">{{ effectiveSentCount.toLocaleString() }}</span>
            </div>
            <v-divider />
            <div class="stat-row">
              <div class="d-flex align-center ga-2">
                <v-icon size="16" color="error">mdi-alert-circle-outline</v-icon>
                <span class="text-body-2 text-medium-emphasis">Failed</span>
              </div>
              <span class="font-weight-bold text-body-1 text-error">{{ effectiveFailedCount.toLocaleString() }}</span>
            </div>
            <v-divider v-if="campaign.total_recipients > 0" />
            <div v-if="campaign.total_recipients > 0" class="stat-row">
              <div class="d-flex align-center ga-2">
                <v-icon size="16" color="primary">mdi-chart-arc</v-icon>
                <span class="text-body-2 text-medium-emphasis">Delivery Rate</span>
              </div>
              <span class="font-weight-bold text-body-1 text-primary">{{ deliveryRate }}%</span>
            </div>
          </div>

          <!-- Progress bar -->
          <div v-if="campaign.total_recipients > 0" class="mt-4">
            <v-progress-linear
              :model-value="deliveryRate"
              color="success"
              bg-color="error"
              rounded
              height="8"
            />
            <div class="d-flex justify-space-between mt-1">
              <span class="text-caption text-success">{{ deliveryRate }}% sent</span>
              <span v-if="failureRate > 0" class="text-caption text-error">{{ failureRate }}% failed</span>
            </div>
          </div>
        </v-card>

        <!-- Mailing list -->
        <v-card rounded="xl" elevation="0" class="pa-5 mb-4 ng-card">
          <div class="d-flex align-center justify-space-between mb-3">
            <p class="font-weight-semibold text-body-1">Mailing List</p>
            <v-btn
              v-if="linkedDomain"
              size="x-small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-account-search-outline"
              rounded="lg"
              @click="showRecipients = true"
            >
              View Recipients
            </v-btn>
          </div>
          <div
            v-if="linkedDomain"
            class="pa-3 rounded-lg" style="background: rgba(var(--v-theme-primary),0.06); border: 1px solid rgba(var(--v-theme-primary),0.15); cursor:pointer"
            @click="showRecipients = true"
          >
            <div class="d-flex align-center ga-2 mb-1">
              <v-icon size="14" color="primary">mdi-account-group-outline</v-icon>
              <p class="text-body-2 font-weight-semibold text-primary">{{ linkedDomain.name }}</p>
            </div>
            <p class="text-caption text-medium-emphasis">
              Source: <strong>{{ linkedDomain.source_table }}</strong> ·
              {{ linkedDomain.rules.length }} rule{{ linkedDomain.rules.length !== 1 ? 's' : '' }} ·
              {{ linkedDomain.rule_logic }}
            </p>
          </div>
          <div v-else class="text-caption text-medium-emphasis">Domain #{{ campaign.domain_id }}</div>
        </v-card>

        <!-- Timeline -->
        <v-card rounded="xl" elevation="0" class="pa-5 ng-card">
          <p class="font-weight-semibold text-body-1 mb-4">Timeline</p>
          <div class="d-flex flex-column ga-3">
            <div class="d-flex align-start ga-3">
              <div class="timeline-dot bg-primary" />
              <div>
                <p class="text-body-2 font-weight-medium">Created</p>
                <p class="text-caption text-medium-emphasis">{{ formatDate(campaign.created_at) }}</p>
              </div>
            </div>
            <div v-if="campaign.scheduled_at" class="d-flex align-start ga-3">
              <div class="timeline-dot bg-info" />
              <div>
                <p class="text-body-2 font-weight-medium">Scheduled</p>
                <p class="text-caption text-medium-emphasis">{{ formatDate(campaign.scheduled_at) }}</p>
              </div>
            </div>
            <div v-if="campaign.started_at" class="d-flex align-start ga-3">
              <div class="timeline-dot bg-warning" />
              <div>
                <p class="text-body-2 font-weight-medium">Started sending</p>
                <p class="text-caption text-medium-emphasis">{{ formatDate(campaign.started_at) }}</p>
              </div>
            </div>
            <div v-if="campaign.completed_at" class="d-flex align-start ga-3">
              <div class="timeline-dot" :class="effectiveStatus === 'failed' ? 'bg-error' : 'bg-success'" />
              <div>
                <p class="text-body-2 font-weight-medium">Completed</p>
                <p class="text-caption text-medium-emphasis">{{ formatDate(campaign.completed_at) }}</p>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirm send dialog -->
    <ConfirmDialog
      v-model="confirmSend"
      title="Send Campaign"
      :message="`Send '${campaign?.name}'${authStore.isAdmin && campaign ? ' from ' + authStore.companyName(campaign.company_id) : ''} to all recipients in its mailing list?`"
      confirm-label="Send Now"
      icon="mdi-send"
      color="primary"
      @confirm="doSend"
    />

    <!-- Mailing list recipients -->
    <RecipientPreviewDialog v-model="showRecipients" :domain="linkedDomain || null" />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCampaignStore } from '@/stores/campaign'
import { useDomainStore } from '@/stores/domain'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import RecipientPreviewDialog from '@/components/RecipientPreviewDialog.vue'
import { getLogDisplayStatus, LOG_STATUS_META, type LogDisplayStatus } from '@/utils/logStatus'

const route  = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const campaignStore = useCampaignStore()
const domainStore   = useDomainStore()

const loading    = ref(true)
const loadingLogs = ref(false)
const sending    = ref(false)
const retrying   = ref(false)
const confirmSend = ref(false)
const logSearch  = ref('')
const showRecipients = ref(false)

const campaign = computed(() => campaignStore.currentCampaign)

const linkedDomain = computed(() =>
  campaign.value ? domainStore.domains.find(d => d.id === campaign.value!.domain_id) : undefined
)

// Campaign totals and lifecycle come from the backend. A limited log page
// cannot establish the final outcome across providers or both channels.
const effectiveSentCount = computed(() => campaign.value?.sent_count || 0)
const effectiveFailedCount = computed(() => campaign.value?.failed_count || 0)
const effectiveStatus = computed(() => campaign.value?.status)

// ── Status display helpers ─────────────────────────────────────────────────

const statusColor = computed(() => {
  switch (effectiveStatus.value) {
    case 'completed':               return 'success'
    case 'completed_with_failures': return 'warning'
    case 'draft':                   return 'warning'
    case 'failed':                  return 'error'
    case 'running':                 return 'secondary-darken-2'
    default:                        return 'secondary'
  }
})
const statusIcon = computed(() => {
  switch (effectiveStatus.value) {
    case 'completed':               return 'mdi-send-check'
    case 'completed_with_failures': return 'mdi-alert'
    case 'draft':                   return 'mdi-pencil'
    case 'failed':                  return 'mdi-alert-circle'
    case 'running':                 return 'mdi-loading'
    default:                        return 'mdi-circle'
  }
})
const channelIcon = computed(() => {
  if (campaign.value?.channel === 'email') return 'mdi-email-outline'
  if (campaign.value?.channel === 'sms')   return 'mdi-message-text-outline'
  return 'mdi-layers-outline'
})
const channelColor = computed(() => {
  if (campaign.value?.channel === 'email') return 'info'
  if (campaign.value?.channel === 'sms')   return 'success'
  return 'secondary'
})

// ── Stats ──────────────────────────────────────────────────────────────────

const deliveryRate = computed(() => {
  if (!campaign.value || !campaign.value.total_recipients) return 0
  return Math.round((effectiveSentCount.value / campaign.value.total_recipients) * 100)
})
const failureRate = computed(() => {
  if (!campaign.value || !campaign.value.total_recipients) return 0
  return Math.round((effectiveFailedCount.value / campaign.value.total_recipients) * 100)
})

// ── Logs ───────────────────────────────────────────────────────────────────
// Show acceptance separately from confirmed delivery for every provider.

const acceptedLogs = computed(() => campaignStore.currentLogs.filter(l => getLogDisplayStatus(l) === 'accepted'))
const deliveredLogs = computed(() => campaignStore.currentLogs.filter(l => getLogDisplayStatus(l) === 'delivered'))
const pendingLogs   = computed(() => campaignStore.currentLogs.filter(l => getLogDisplayStatus(l) === 'pending'))
const failedLogs    = computed(() => campaignStore.currentLogs.filter(l => getLogDisplayStatus(l) === 'failed'))

const logFilter = ref<'all' | LogDisplayStatus>('all')
const logFilters: { value: 'all' | LogDisplayStatus; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'pending',   label: 'Pending' },
  { value: 'failed',    label: 'Failed' },
]

const filteredLogs = computed(() => {
  let logs = campaignStore.currentLogs
  if (logFilter.value !== 'all') logs = logs.filter(l => getLogDisplayStatus(l) === logFilter.value)
  if (!logSearch.value) return logs
  const q = logSearch.value.toLowerCase()
  return logs.filter(l => l.recipient.toLowerCase().includes(q))
})

async function loadLogs() {
  if (!campaign.value) return
  loadingLogs.value = true
  await campaignStore.fetchLogs(campaign.value.id)
  loadingLogs.value = false
}

// ── Live status polling ─────────────────────────────────────────────────────
// Refresh drafts awaiting scheduled workers and running campaigns, including logs.
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

function startPolling() {
  stopPolling()
  pollTimer.value = setInterval(async () => {
    if (!campaign.value) return
    await campaignStore.fetchOne(campaign.value.id)
    await loadLogs()
    if (campaign.value?.status !== 'running' && campaign.value?.status !== 'draft') {
      stopPolling()
      await loadLogs()
    }
  }, 5000)
}

// ── Actions ────────────────────────────────────────────────────────────────

async function doSend() {
  if (!campaign.value) return
  sending.value = true
  const ok = await campaignStore.send(campaign.value.id)
  sending.value = false
  if (ok) {
    // Refresh campaign data and reload logs
    await campaignStore.fetchOne(campaign.value.id)
    await loadLogs()
    if (campaign.value?.status === 'running' || campaign.value?.status === 'draft') startPolling()
  }
}

async function handleRetry() {
  if (!campaign.value) return
  retrying.value = true
  await campaignStore.retryFailed(campaign.value.id)
  await campaignStore.fetchOne(campaign.value.id)
  await loadLogs()
  retrying.value = false
  if (campaign.value?.status === 'running' || campaign.value?.status === 'draft') startPolling()
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// A campaign that was just created/sent can occasionally 404 or time out on
// the very next GET (backend still committing, or busy dispatching). Retry a
// couple of times before showing "Campaign not found" instead of treating
// the first transient failure as proof the campaign doesn't exist.
async function fetchOneWithRetry(id: number, attempts = 3, delayMs = 700) {
  for (let i = 0; i < attempts; i++) {
    const res = await campaignStore.fetchOne(id)
    if (res) return res
    if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs))
  }
  return null
}

onMounted(async () => {
  const id = Number(route.params.id)
  // Clear stale state so we don't flash the previous campaign's data
  campaignStore.setCurrent(null)
  campaignStore.clearLogs()
  await Promise.all([
    fetchOneWithRetry(id),
    domainStore.fetchAll(),
  ])
  loading.value = false

  // Auto-load logs if campaign has been sent
  if (campaign.value && campaign.value.status !== 'draft') {
    await loadLogs()
  }
  if (campaign.value?.status === 'running' || campaign.value?.status === 'draft') startPolling()
})

onUnmounted(() => stopPolling())
</script>

<style scoped>
.ng-card {
  border: 1.5px solid rgb(var(--v-theme-card-border));
}
.field-label {
  font-size: 12.5px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);
  letter-spacing: 0.2px;
}
.section-label {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: 0.3px;
}
.sms-preview {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border: 1.5px solid rgb(var(--v-theme-card-border));
}
.email-preview {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border: 1.5px solid rgb(var(--v-theme-card-border));
  font-size: 13.5px;
  line-height: 1.7;
}
.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}
.log-row {
  transition: background 0.15s;
}
.log-row--delivered {
  background: rgba(25,118,210,0.05);
  border: 1px solid rgba(25,118,210,0.1);
}
.log-row--pending {
  background: rgba(237,108,2,0.05);
  border: 1px solid rgba(237,108,2,0.15);
}
.log-row--failed {
  background: rgba(211,33,41,0.05);
  border: 1px solid rgba(211,33,41,0.1);
}
.gap-log {
  gap: 4px;
}
.log-filter-btn {
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1.5px solid rgb(var(--v-theme-card-border));
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.5);
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'DM Sans', sans-serif;
}
.log-filter-btn:hover {
  border-color: rgba(var(--v-theme-primary), 0.4);
  color: rgb(var(--v-theme-on-surface));
}
.log-filter-btn--active {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: #fff;
}
</style>
