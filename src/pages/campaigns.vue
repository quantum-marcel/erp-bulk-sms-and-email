
<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-start align-sm-center justify-space-between mb-5 flex-wrap ga-3">
      <div>
        <h2 class="font-weight-bold" style="font-size:clamp(18px,4vw,22px)">Campaigns</h2>
        <p class="text-medium-emphasis text-body-2">
          Create and manage your bulk messaging campaigns.
        </p>
      </div>
      <v-btn to="/compose" color="primary" prepend-icon="mdi-plus" rounded="xl" elevation="0" style="font-weight:700">
        New Campaign
      </v-btn>
    </div>

    <v-card v-if="!authStore.hasCompany" class="pa-6 ng-card" rounded="xl">
      <p class="text-body-2">{{ authStore.isAdmin ? 'Select a company above to view its campaigns.' : 'Contact an administrator to assign your account to a company.' }}</p>
    </v-card>
    <template v-else>
    <p class="text-body-2 text-medium-emphasis mb-4">Campaigns for {{ authStore.activeCompany?.name }}</p>
    <!-- Tabs -->
    <v-tabs v-model="tab" color="primary" class="mb-5" density="compact">
      <v-tab value="all">All</v-tab>
      <v-tab value="draft">Drafts</v-tab>
      <v-tab value="running">Sending</v-tab>
      <v-tab value="completed">Completed</v-tab>
      <v-tab value="completed_with_failures">Partial failures</v-tab>
      <v-tab value="failed">Failed</v-tab>
    </v-tabs>

    <!-- Search -->
    <SearchField v-model="search" placeholder="Search campaigns..." class="mb-5" />

    <v-alert v-if="error" type="error" class="mb-4">{{ error }} <v-btn @click="load">Retry</v-btn></v-alert>
    <p class="text-caption mb-3">{{ total }} matching campaigns</p>
    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Empty -->
    <div v-else-if="items.length === 0" class="text-center py-16">
      <v-icon size="64" color="medium-emphasis" class="mb-4">{{ emptyIcon }}</v-icon>
      <p class="font-weight-semibold text-h6 mb-1">{{ emptyTitle }}</p>
      <p class="text-medium-emphasis text-body-2 mb-4">{{ emptySubtitle }}</p>
      <v-btn to="/compose" color="primary" rounded="xl" prepend-icon="mdi-plus" elevation="0">
        New Campaign
      </v-btn>
    </div>

    <v-alert v-if="targetCampaign && campaignStore.sendErrors[targetCampaign.id]" type="error" variant="tonal" class="mb-4">
      {{ campaignStore.sendErrors[targetCampaign.id] }}
    </v-alert>

    <!-- Campaign list -->
    <div v-if="!loading && items.length > 0" class="d-flex flex-column ga-3">
      <CampaignCard
        v-for="c in items"
        :key="c.id"
        :campaign="c"
        :company-label="authStore.isAdmin ? authStore.companyName(c.company_id) : undefined"
        @view="router.push(`/campaign-detail-${c.id}`)"
        @send="handleSend(c)"
        @retry="handleRetry(c)"
        @logs="handleLogs(c)"
      />
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="d-flex justify-center mt-6">
      <v-pagination
        v-model="page"
        :length="totalPages"
        :total-visible="7"
        color="primary"
        rounded="circle"
        density="comfortable"
      />
    </div>


    <!-- Send confirm -->
    <ConfirmDialog
      v-model="showSend"
      title="Send Campaign"
      :message="`Send '${targetCampaign?.name}'${authStore.isAdmin && targetCampaign ? ' from ' + authStore.companyName(targetCampaign.company_id) : ''} to all recipients in its mailing list?`"
      confirm-label="Send Now"
      icon="mdi-send"
      color="primary"
      @confirm="doSend"
    />

    <!-- Logs drawer -->
    <v-navigation-drawer
      v-model="showLogs"
      location="right"
      width="480"
      temporary
    >
      <div class="pa-5">
        <div class="d-flex align-center justify-space-between mb-4">
          <p class="font-weight-bold text-body-1">Campaign Logs</p>
          <v-btn icon variant="text" size="small" @click="showLogs = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <p class="text-caption text-medium-emphasis mb-4">{{ targetCampaign?.name }}</p>

        <v-alert v-if="logsError" type="error">{{ logsError }} <v-btn @click="loadLogPage">Retry</v-btn></v-alert>
        <div v-if="loadingLogs" class="d-flex justify-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <div v-else-if="campaignStore.currentLogs.length === 0" class="text-center py-8">
          <v-icon size="40" color="medium-emphasis" class="mb-2">mdi-text-box-outline</v-icon>
          <p class="text-medium-emphasis text-body-2">No logs yet.</p>
        </div>

        <v-list v-else density="compact">
          <v-list-item
            v-for="log in campaignStore.currentLogs"
            :key="log.id"
            class="rounded-lg mb-1"
            :style="{ background: `rgba(var(--v-theme-${LOG_STATUS_META[getLogDisplayStatus(log)].color}), 0.06)` }"
          >
            <template #prepend>
              <v-icon size="16" :color="LOG_STATUS_META[getLogDisplayStatus(log)].color">
                {{ LOG_STATUS_META[getLogDisplayStatus(log)].icon }}
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2">{{ log.recipient }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ log.channel.toUpperCase() }} · {{ formatDate(log.sent_at) }} · {{ LOG_STATUS_META[getLogDisplayStatus(log)].label }}
              <span v-if="log.error" class="text-error"> · {{ log.error }}</span>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <v-pagination v-model="logPage" :length="Math.max(1, Math.ceil(campaignStore.logsTotal / 20))" :total-visible="5" :disabled="loadingLogs" />
      </div>
    </v-navigation-drawer>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { useServerPage } from '@/composables/useServerPage'
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCampaignStore } from '@/stores/campaign'
import CampaignCard from '@/components/CampaignCard.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { Campaign } from '@/types/sms'
import { getLogDisplayStatus, LOG_STATUS_META } from '@/utils/logStatus'

const router = useRouter()
const authStore = useAuthStore()
const campaignStore = useCampaignStore()

const tab    = ref('all')
const showSend   = ref(false)
const showLogs   = ref(false)
const loadingLogs = ref(false)
const logsError = ref('')
let logsRequest = 0
onBeforeUnmount(() => { logsRequest++; campaignStore.clearLogs() })
const logPage = ref(1)
async function loadLogPage() {
  if (!targetCampaign.value || !showLogs.value) return
  const request = ++logsRequest
  loadingLogs.value = true; logsError.value = ''
  const result = await campaignStore.fetchLogs(targetCampaign.value.id, 20, (logPage.value - 1) * 20)
  if (request !== logsRequest) return
  if (!result) { campaignStore.clearLogs(); logsError.value = 'Could not load logs.' }
  loadingLogs.value = false
}
watch(logPage, loadLogPage)
const targetCampaign = ref<Campaign | null>(null)
const { items, total, page, totalPages, search, loading, error, load } = useServerPage<Campaign>(
  () => authStore.hasCompany ? '/campaigns/' : null,
  () => ({ status: tab.value === 'all' ? undefined : tab.value }), 5,
)

const emptyIcon = computed(() => {
  if (tab.value === 'draft')  return 'mdi-file-document-edit-outline'
  if (tab.value === 'failed') return 'mdi-alert-circle-outline'
  if (tab.value === 'sent')   return 'mdi-send-outline'
  return 'mdi-bullhorn-outline'
})
const emptyTitle = computed(() => {
  if (tab.value === 'draft')  return 'No drafts'
  if (tab.value === 'failed') return 'No failed campaigns'
  if (tab.value === 'sent')   return 'No sent campaigns'
  return 'No campaigns yet'
})
const emptySubtitle = computed(() => {
  if (search.value) return 'No campaigns match your search.'
  if (tab.value === 'draft') return 'Save a campaign as draft and it will appear here.'
  return 'Create your first campaign to get started.'
})

function handleSend(c: Campaign) {
  targetCampaign.value = c
  showSend.value = true
}
async function handleRetry(c: Campaign) {
  await campaignStore.retryFailed(c.id)
  await load()
}
async function handleLogs(c: Campaign) {
  targetCampaign.value = c
  showLogs.value = true
  campaignStore.clearLogs()
  if (logPage.value !== 1) logPage.value = 1
  else await loadLogPage()
}

async function doSend() {
  if (!targetCampaign.value) return
  await campaignStore.send(targetCampaign.value.id)
  await load()
}
function formatDate(d: string) {
  return new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
}


</script>
