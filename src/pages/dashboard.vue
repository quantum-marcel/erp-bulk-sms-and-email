<template>
  <div>
    <!-- Greeting -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h2 class="dash-heading">Good {{ greeting }}, {{ firstName }} 👋</h2>
        <p class="dash-sub">{{ today }}</p>
      </div>
      <v-btn to="/compose" rounded="xl" elevation="0" class="dash-compose-btn d-none d-sm-flex" prepend-icon="mdi-plus">
        New Campaign
      </v-btn>
    </div>

    <v-card v-if="!authStore.hasCompany" rounded="xl" class="pa-6 ng-card">
      <p class="font-weight-semibold mb-2">{{ authStore.isAdmin ? 'Choose a company to get started' : 'Company access required' }}</p>
      <p class="text-body-2 text-medium-emphasis">{{ authStore.isAdmin ? 'Select a company above to view its campaigns and mailing lists.' : 'Contact an administrator to assign your account to a company.' }}</p>
    </v-card>
    <template v-else>
    <p class="text-body-2 text-medium-emphasis mb-4">{{ authStore.activeCompany?.name }} · Campaign overview</p>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }} <v-btn @click="loadOverview">Retry</v-btn></v-alert>
    <!-- Stat cards -->
    <v-row class="mb-6" dense align="stretch">
      <v-col cols="6" md="3">
        <StatCard label="Total Campaigns" :value="stats.totalCampaigns" icon="mdi-bullhorn-outline" color="primary" subtext="All time" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="Sent" :value="stats.totalSent" icon="mdi-send-check" color="success" subtext="Dispatched" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="Drafts" :value="stats.drafts" icon="mdi-file-document-edit-outline" color="warning" subtext="Unsent" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="Mailing Lists" :value="stats.domains" icon="mdi-account-group-outline" color="info" subtext="Domains" />
      </v-col>
    </v-row>

    <v-row>
      <!-- Recent campaigns -->
      <v-col cols="12" md="7">
        <v-card rounded="xl" class="pa-5 ng-card">
          <div class="d-flex align-center justify-space-between mb-4">
            <p class="font-weight-semibold text-body-1">Campaigns</p>
            <v-btn to="/campaigns" variant="text" size="small" color="primary">View all</v-btn>
          </div>

          <div v-if="loading" class="d-flex justify-center py-8">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <div v-else-if="recent.length === 0" class="text-center py-10">
            <v-icon size="44" color="medium-emphasis" class="mb-3">mdi-bullhorn-outline</v-icon>
            <p class="text-medium-emphasis text-body-2">No campaigns yet.</p>
            <v-btn to="/compose" color="primary" variant="tonal" rounded="xl" size="small" class="mt-3">
              Create first campaign
            </v-btn>
          </div>
          <div v-else class="d-flex flex-column ga-2">
            <div
              v-for="c in recent"
              :key="c.id"
              class="dash-campaign-row"
              @click="router.push(`/campaign-detail-${c.id}`)"
            >
              <div class="chan-dot" :style="{ background: c.channel === 'email' ? '#1565C0' : c.channel === 'sms' ? '#2E7D32' : '#6F2DBD' }" />
              <div class="flex-grow-1" style="min-width:0">
                <p class="text-body-2 font-weight-semibold text-truncate">{{ c.name }}</p>
                <p class="text-caption text-medium-emphasis">{{ authStore.isAdmin ? authStore.companyName(c.company_id) + ' · ' : '' }}{{ c.channel.toUpperCase() }} · {{ formatDate(c.created_at) }}</p>
              </div>
              <v-chip size="x-small" :color="statusColor(c.status)" label variant="tonal">{{ c.status }}</v-chip>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Drafts + quick actions -->
      <v-col cols="12" md="5">
        <v-card rounded="xl" class="pa-5 mb-4 ng-card">
          <div class="d-flex align-center justify-space-between mb-3">
            <p class="font-weight-semibold text-body-1">Drafts</p>
            <v-btn to="/campaigns" variant="text" size="small" color="primary">View all</v-btn>
          </div>
          <div v-if="draftItems.length === 0" class="text-center py-5">
            <v-icon size="32" color="medium-emphasis" class="mb-2">mdi-file-document-edit-outline</v-icon>
            <p class="text-medium-emphasis text-caption">No drafts saved.</p>
          </div>
          <div v-else class="d-flex flex-column ga-2">
            <div
              v-for="d in draftItems"
              :key="d.id"
              class="dash-draft-row"
              @click="router.push(`/campaign-detail-${d.id}`)"
            >
              <v-icon size="15" color="warning" class="mr-2">mdi-file-document-edit-outline</v-icon>
              <div class="flex-grow-1" style="min-width:0">
                <p class="text-body-2 font-weight-medium text-truncate">{{ d.name }}</p>
                <p class="text-caption text-medium-emphasis">{{ authStore.isAdmin ? authStore.companyName(d.company_id) + ' · ' : '' }}{{ d.channel.toUpperCase() }} · {{ formatDate(d.created_at) }}</p>
              </div>
              <v-icon size="13" color="medium-emphasis">mdi-chevron-right</v-icon>
            </div>
          </div>
        </v-card>

        <v-card rounded="xl" class="pa-5 ng-card">
          <p class="font-weight-semibold text-body-1 mb-3">Quick Actions</p>
          <div class="d-flex flex-column ga-2">
            <v-btn v-for="a in quickActions" :key="a.label" :to="a.to" :color="a.color" variant="tonal" rounded="xl" :prepend-icon="a.icon" block class="justify-start" elevation="0">
              {{ a.label }}
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import StatCard from '@/components/StatCard.vue'
import { get } from '@/utils/http'
import { fetchPage } from '@/utils/pagination'
import type { Campaign, CampaignStatus } from '@/types/sms'

const authStore    = useAuthStore()
const router       = useRouter()
const loading      = ref(false)

const firstName = computed(() => authStore.user?.fullName?.split(' ')[0] || 'there')
const greeting  = computed(() => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening' })
const today     = computed(() => new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' }))

const stats = ref({ totalCampaigns: 0, totalSent: 0, drafts: 0, domains: 0 })
const recent = ref<Campaign[]>([])
const draftItems = ref<Campaign[]>([])
const error = ref('')
let active = true
onBeforeUnmount(() => { active = false })

const quickActions = [
  { label: 'New Campaign',       to: '/compose',       icon: 'mdi-plus',                color: 'primary' },
  { label: 'View Campaigns',     to: '/campaigns',     icon: 'mdi-bullhorn-outline',    color: 'secondary' },
  { label: 'Manage Mailing Lists', to: '/mailing-lists', icon: 'mdi-account-group-outline', color: 'info' },
]

function statusColor(s: CampaignStatus) {
  return ({
    completed:               'success',
    completed_with_failures: 'warning',
    draft:                   'warning',
    failed:                  'error',
    running:                 'info',
  } as Record<string, string>)[s] || 'secondary'
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
}

async function loadOverview() {
  if (!authStore.hasCompany) return
  loading.value = true; error.value = ''
  try {
    const [all, drafts, domains, ...sent] = await Promise.all([
      fetchPage<Campaign>(get, '/campaigns/', { limit: 5 }),
      fetchPage<Campaign>(get, '/campaigns/', { limit: 4, status: 'draft' }),
      fetchPage(get, '/domains/', { limit: 1 }),
      ...['running', 'completed', 'completed_with_failures'].map(status => fetchPage(get, '/campaigns/', { limit: 1, status })),
    ])
    if (!active) return
    stats.value = { totalCampaigns: all.total, drafts: drafts.total, domains: domains.total, totalSent: sent.reduce((sum, result) => sum + result.total, 0) }
    recent.value = all.items
    draftItems.value = drafts.items
  } catch (e) { if (active) error.value = e instanceof Error ? e.message : 'Could not load overview.' }
  finally { if (active) loading.value = false }
}
onMounted(loadOverview)
</script>

<style scoped>
.dash-heading { font-size: 22px; font-weight: 800; color: rgb(var(--v-theme-on-surface)); }
.dash-sub     { font-size: 13px; color: rgba(var(--v-theme-on-surface), 0.45); margin-top: 2px; }
.ng-card      { border: 1.5px solid rgb(var(--v-theme-card-border)); }
.dash-compose-btn {
  background: #6F2DBD !important; color: #fff !important;
  font-weight: 700 !important; font-size: 13px !important;
}
.dash-campaign-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: 10px;
  border: 1px solid transparent; cursor: pointer; transition: all 0.15s;
}
.dash-campaign-row:hover { background: rgba(111,45,189,0.04); border-color: rgba(111,45,189,0.15); }
.chan-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dash-draft-row {
  display: flex; align-items: center;
  padding: 8px 10px; border-radius: 10px;
  border: 1px solid transparent; cursor: pointer; transition: all 0.15s;
}
.dash-draft-row:hover { background: rgba(255,220,0,0.08); border-color: rgba(255,220,0,0.3); }
</style>
