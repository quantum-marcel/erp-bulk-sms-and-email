
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

    <!-- Tabs -->
    <v-tabs v-model="tab" color="primary" class="mb-5" density="compact">
      <v-tab value="all">
        All
        <v-chip size="x-small" class="ml-2" color="primary" variant="tonal">{{ campaignStore.campaigns.length }}</v-chip>
      </v-tab>
      <v-tab value="draft">
        Drafts
        <v-chip v-if="campaignStore.draftCount" size="x-small" class="ml-2" color="warning" variant="tonal">
          {{ campaignStore.draftCount }}
        </v-chip>
      </v-tab>
      <v-tab value="sent">Sent</v-tab>
      <v-tab value="failed">
        Failed
        <v-chip v-if="campaignStore.failedCount" size="x-small" class="ml-2" color="error" variant="tonal">
          {{ campaignStore.failedCount }}
        </v-chip>
      </v-tab>
    </v-tabs>

    <!-- Search -->
    <v-text-field
      v-model="search"
      placeholder="Search campaigns..."
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      rounded="xl"
      hide-details
      clearable
      class="mb-5"
      style="max-width:min(420px, 100%)"
    />

    <!-- Loading -->
    <div v-if="campaignStore.isLoading" class="d-flex justify-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="text-center py-16">
      <v-icon size="64" color="medium-emphasis" class="mb-4">{{ emptyIcon }}</v-icon>
      <p class="font-weight-semibold text-h6 mb-1">{{ emptyTitle }}</p>
      <p class="text-medium-emphasis text-body-2 mb-4">{{ emptySubtitle }}</p>
      <v-btn to="/compose" color="primary" rounded="xl" prepend-icon="mdi-plus" elevation="0">
        New Campaign
      </v-btn>
    </div>

    <!-- Campaign list -->
    <div v-else class="d-flex flex-column ga-3">
      <CampaignCard
        v-for="c in paginatedItems"
        :key="c.id"
        :campaign="c"
        @view="router.push(`/campaign-detail-${c.id}`)"
        @edit="router.push(`/campaign-detail-${c.id}`)"
        @send="handleSend(c)"
        @retry="handleRetry(c)"
        @delete="handleDelete(c)"
        @logs="handleLogs(c)"
      />
    </div>

    <!-- Pagination -->
    <div v-if="filtered.length > 0 && totalPages > 1" class="d-flex justify-center mt-6">
      <v-pagination
        v-model="page"
        :length="totalPages"
        :total-visible="7"
        color="primary"
        rounded="circle"
        density="comfortable"
      />
    </div>

    <!-- Delete confirm -->
    <ConfirmDialog
      v-model="showDelete"
      title="Delete Campaign"
      message="This draft will be permanently deleted."
      confirm-label="Delete"
      icon="mdi-delete-outline"
      color="error"
      @confirm="doDelete"
    />

    <!-- Send confirm -->
    <ConfirmDialog
      v-model="showSend"
      title="Send Campaign"
      :message="`Send '${targetCampaign?.name}' to all recipients in its mailing list?`"
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
            :style="{ background: log.status === 'failed' ? 'rgba(211,33,41,0.06)' : 'rgba(46,125,50,0.06)' }"
          >
            <template #prepend>
              <v-icon size="16" :color="log.status === 'sent' ? 'success' : 'error'">
                {{ log.status === 'sent' ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline' }}
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2">{{ log.recipient }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ log.channel.toUpperCase() }} · {{ formatDate(log.sent_at) }}
              <span v-if="log.error" class="text-error"> · {{ log.error }}</span>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>
    </v-navigation-drawer>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaign'
import CampaignCard from '@/components/CampaignCard.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { Campaign } from '@/types/sms'

const router = useRouter()
const campaignStore = useCampaignStore()

const tab    = ref('all')
const search = ref('')
const showDelete = ref(false)
const showSend   = ref(false)
const showLogs   = ref(false)
const loadingLogs = ref(false)
const targetCampaign = ref<Campaign | null>(null)
const page = ref(1)
const itemsPerPage = ref(5)

// Reset page when tab or search changes
watch([tab, search], () => {
  page.value = 1
})

const tabList = computed(() => {
  switch (tab.value) {
    case 'draft':  return campaignStore.drafts
    case 'sent':   return campaignStore.sent
    case 'failed': return campaignStore.failed
    default:       return campaignStore.campaigns
  }
})

const filtered = computed(() => {
  if (!search.value) return tabList.value
  const q = search.value.toLowerCase()
  return tabList.value.filter(c => c.name.toLowerCase().includes(q))
})

const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filtered.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filtered.value.length / itemsPerPage.value))

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
function handleDelete(c: Campaign) {
  targetCampaign.value = c
  showDelete.value = true
}
async function handleRetry(c: Campaign) {
  await campaignStore.retryFailed(c.id)
  await campaignStore.fetchAll(true)
}
async function handleLogs(c: Campaign) {
  targetCampaign.value = c
  showLogs.value = true
  loadingLogs.value = true
  await campaignStore.fetchLogs(c.id)
  loadingLogs.value = false
}

async function doSend() {
  if (!targetCampaign.value) return
  await campaignStore.send(targetCampaign.value.id)
  await campaignStore.fetchAll(true)
}
async function doDelete() {
  if (!targetCampaign.value) return
  await campaignStore.remove(targetCampaign.value.id)
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
}

onMounted(() => campaignStore.fetchAll())
</script>
