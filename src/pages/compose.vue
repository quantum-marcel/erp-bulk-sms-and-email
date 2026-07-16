
<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-start align-sm-center justify-space-between mb-6 flex-wrap ga-2">
      <div>
        <h2 class="font-weight-bold" style="font-size:clamp(17px,4vw,22px)">
          {{ isEditing ? 'Edit Campaign' : 'New Campaign' }}
        </h2>
        <p class="text-medium-emphasis text-body-2">
          {{ isEditing ? 'Update your draft campaign.' : 'Create a new bulk messaging campaign.' }}
        </p>
      </div>
      <div class="d-flex align-center ga-2">
        <div v-if="lastSaved" class="d-flex align-center ga-1 text-caption text-medium-emphasis">
          <v-icon size="13">mdi-cloud-check-outline</v-icon>
          Saved {{ lastSaved }}
        </div>
        <v-btn v-if="isEditing" variant="text" color="error" size="small" @click="router.push('/campaigns')">
          Cancel
        </v-btn>
      </div>
    </div>

    <v-row>
      <!-- ── LEFT: Campaign content ── -->
      <v-col cols="12" lg="7">

        <!-- Campaign name -->
        <v-card rounded="xl" elevation="0" class="pa-5 mb-4 ng-card">
          <label class="field-label">Campaign Name <span class="text-error">*</span></label>
          <v-text-field
            v-model="form.name"
            placeholder="e.g. April Overdue Notice"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            hide-details
            class="mt-1"
          />
        </v-card>

        <!-- Channel selector -->
        <v-card rounded="xl" elevation="0" class="pa-5 mb-4 ng-card">
          <label class="field-label mb-3 d-block">Channel</label>
          <div class="d-flex ga-2">
            <button
              v-for="ch in channels"
              :key="ch.value"
              class="channel-btn"
              :class="{ 'channel-btn--active': form.channel === ch.value }"
              @click="form.channel = ch.value"
            >
              <v-icon :size="18" class="mr-1">{{ ch.icon }}</v-icon>
              {{ ch.label }}
            </button>
          </div>
        </v-card>

        <!-- EMAIL section -->
        <v-card
          v-if="form.channel === 'email' || form.channel === 'both'"
          rounded="xl" elevation="0" class="pa-5 mb-4 ng-card"
        >
          <div class="section-label mb-4">
            <v-icon size="16" color="info" class="mr-1">mdi-email-outline</v-icon>
            Email
          </div>

          <label class="field-label">Subject <span class="text-error">*</span></label>
          <v-text-field
            v-model="form.subject"
            placeholder="e.g. Your balance is overdue — action required"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            hide-details
            class="mt-1 mb-4"
          />

          <label class="field-label">Body</label>
          <div class="mt-1 mb-4">
            <TiptapEditor v-model="form.email_body" placeholder="Message Body Here" />
          </div>
        </v-card>

        <!-- SMS section -->
        <v-card
          v-if="form.channel === 'sms' || form.channel === 'both'"
          rounded="xl" elevation="0" class="pa-5 mb-4 ng-card"
        >
          <div class="section-label mb-4">
            <v-icon size="16" color="success" class="mr-1">mdi-message-text-outline</v-icon>
            SMS
          </div>

          <label class="field-label">SMS Body <span class="text-error">*</span></label>
          <v-textarea
            v-model="form.sms_body"
            placeholder="Message Body Here"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            rows="4"
            auto-grow
            counter
            :maxlength="1600"
            hide-details="auto"
            class="mt-1 mb-4"
          />
          <!-- SMS char counter -->
          <div class="d-flex align-center ga-2 mt-1">
            <v-chip
              size="x-small"
              :color="smsPartColor"
              label
              variant="tonal"
            >
              {{ smsChars }} / 160 · Part {{ smsPart }}
            </v-chip>
            <span class="text-caption text-medium-emphasis">{{ 160 - (smsChars % 160) }} chars left in this part</span>
          </div>

        </v-card>

      </v-col>

      <!-- ── RIGHT: Domain + Actions ── -->
      <v-col cols="12" lg="5">

        <!-- Mailing list (domain) selector -->
        <v-card rounded="xl" elevation="0" class="pa-5 mb-4 ng-card">
          <div class="d-flex align-center justify-space-between mb-3">
            <p class="font-weight-semibold text-body-1">Mailing List</p>
            <v-btn
              variant="text"
              size="x-small"
              color="primary"
              prepend-icon="mdi-plus"
              to="/mailing-lists"
            >
              New list
            </v-btn>
          </div>

          <div v-if="domainStore.isLoading" class="d-flex justify-center py-4">
            <v-progress-circular indeterminate color="primary" size="24" />
          </div>
          <v-select
            v-else
            v-model="form.domain_id"
            :items="domainStore.domains"
            item-title="name"
            item-value="id"
            placeholder="Select a mailing list..."
            variant="outlined"
            density="comfortable"
            rounded="lg"
            clearable
            hide-details="auto"
            :rules="[v => !!v || 'Please select a mailing list']"
          >
            <template #item="{ props: p, item }">
              <v-list-item v-bind="p">
                <template #subtitle>
                  <span class="text-caption text-medium-emphasis">
                    {{ item.raw.source_table }} · {{ item.raw.rule_logic }}
                  </span>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <div v-if="selectedDomain" class="mt-3 pa-3 rounded-lg" style="background: rgba(var(--v-theme-primary),0.06); border: 1px solid rgba(var(--v-theme-primary),0.15)">
            <p class="text-caption font-weight-semibold text-primary">{{ selectedDomain.name }}</p>
            <p class="text-caption text-medium-emphasis mt-1">
              Source: <strong>{{ selectedDomain.source_table }}</strong> ·
              {{ selectedDomain.rules.length }} rule{{ selectedDomain.rules.length !== 1 ? 's' : '' }}
            </p>
          </div>
        </v-card>

        <!-- Schedule (optional) -->
        <v-card rounded="xl" elevation="0" class="pa-5 mb-4 ng-card">
          <div class="d-flex align-center justify-space-between mb-3">
            <p class="font-weight-semibold text-body-1">Schedule <span class="text-caption text-medium-emphasis">(optional)</span></p>
            <v-btn
              v-if="form.scheduled_at"
              size="x-small" variant="text" color="error"
              prepend-icon="mdi-close-circle-outline"
              @click="clearSchedule"
            >
              Clear
            </v-btn>
          </div>

          <!-- Toggle switch -->
          <div class="d-flex align-center ga-3 mb-4">
            <v-switch
              v-model="scheduleEnabled"
              color="primary"
              hide-details
              density="compact"
              @change="onScheduleToggle"
            />
            <span class="text-body-2" :class="scheduleEnabled ? 'font-weight-medium' : 'text-medium-emphasis'">
              {{ scheduleEnabled ? 'Send at a specific time' : 'Send immediately' }}
            </span>
          </div>

          <div v-if="scheduleEnabled" class="schedule-picker">
            <!-- Date picker -->
            <label class="field-label d-block mb-1">Date</label>
            <v-text-field
              v-model="schedDate"
              type="date"
              :min="todayStr"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details
              prepend-inner-icon="mdi-calendar-outline"
              class="mb-3"
              @change="buildScheduledAt"
            />

            <!-- Time: hour + minute selects -->
            <label class="field-label d-block mb-1">Time</label>
            <div class="d-flex ga-2 align-center">
              <v-select
                v-model="schedHour"
                :items="hourItems"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                hide-details
                prepend-inner-icon="mdi-clock-outline"
                style="max-width:140px"
                @update:model-value="buildScheduledAt"
              />
              <span class="font-weight-bold text-h6" style="color:rgba(0,0,0,0.3)">:</span>
              <v-select
                v-model="schedMinute"
                :items="minuteItems"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                hide-details
                style="max-width:120px"
                @update:model-value="buildScheduledAt"
              />
              <v-select
                v-model="schedAmPm"
                :items="['AM','PM']"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                hide-details
                style="max-width:100px"
                @update:model-value="buildScheduledAt"
              />
            </div>

            <!-- Preview -->
            <div v-if="form.scheduled_at" class="mt-3 pa-3 rounded-lg schedule-preview">
              <div class="d-flex align-center ga-2">
                <v-icon size="14" color="primary">mdi-calendar-clock</v-icon>
                <span class="text-caption font-weight-medium text-primary">
                  Scheduled for {{ formatSchedulePreview(form.scheduled_at) }}
                </span>
              </div>
            </div>
          </div>

          <p v-else class="text-caption text-medium-emphasis mt-1">
            The campaign will start sending as soon as you click "Send Now".
          </p>
        </v-card>

        <!-- Actions -->
        <v-card rounded="xl" elevation="0" class="pa-5 ng-card">
          <p class="font-weight-semibold text-body-1 mb-4">Actions</p>
          <div class="d-flex flex-column ga-3">

            <!-- Save / Update draft -->
            <v-btn
              block size="large" rounded="xl" elevation="0"
              variant="tonal" color="secondary-darken-2"
              prepend-icon="mdi-content-save-outline"
              :loading="saving"
              :disabled="!form.name"
              @click="handleSave"
            >
              {{ isEditing ? 'Update Draft' : 'Save as Draft' }}
            </v-btn>

            <!-- Send now -->
            <v-btn
              block size="large" rounded="xl" elevation="0"
              color="primary"
              prepend-icon="mdi-send"
              :loading="sending"
              :disabled="!canSend"
              style="font-weight:700"
              @click="handleSend"
            >
              {{ form.scheduled_at ? 'Schedule Campaign' : 'Send Now' }}
            </v-btn>

            <!-- Clear -->
            <v-btn
              v-if="!isEditing"
              block rounded="xl" variant="text" color="error"
              prepend-icon="mdi-delete-outline"
              :disabled="!form.name && !form.email_body && !form.sms_body"
              @click="clearForm"
            >
              Clear Form
            </v-btn>

          </div>

          <!-- Validation hint -->
          <v-alert
            v-if="!canSend && form.name"
            type="warning"
            density="compact"
            rounded="xl"
            variant="tonal"
            class="mt-4"
            icon="mdi-alert-outline"
          >
            {{ validationHint }}
          </v-alert>
        </v-card>

      </v-col>
    </v-row>

    <!-- Confirm send -->
    <ConfirmDialog
      v-model="confirmSend"
      title="Send Campaign"
      :message="`Send '${form.name}' to all recipients in the selected mailing list?`"
      confirm-label="Send Campaign"
      icon="mdi-send"
      color="primary"
      @confirm="doSend"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaign'
import { useDomainStore } from '@/stores/domain'
import TiptapEditor from '@/components/compose/TiptapEditor.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { CampaignChannel } from '@/types/sms'

const route    = useRoute()
const router   = useRouter()
const campaignStore = useCampaignStore()
const domainStore   = useDomainStore()

const campaignId = computed(() => route.params.id ? Number(route.params.id) : undefined)
const isEditing  = computed(() => !!campaignId.value)

const saving      = ref(false)
const sending     = ref(false)
const confirmSend = ref(false)
const lastSaved   = ref<string | null>(null)

// ── Schedule picker state ──────────────────────────────────────────────────
const scheduleEnabled = ref(false)
const schedDate   = ref('')
const schedHour   = ref('08')
const schedMinute = ref('00')
const schedAmPm   = ref('AM')

const todayStr = computed(() => new Date().toISOString().split('T')[0])

const hourItems = Array.from({ length: 12 }, (_, i) => {
  const h = String(i + 1).padStart(2, '0')
  return { title: h, value: h }
})
const minuteItems = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => ({ title: m, value: m }))

function buildScheduledAt() {
  if (!schedDate.value) { form.scheduled_at = ''; return }
  let h = parseInt(schedHour.value)
  if (schedAmPm.value === 'PM' && h !== 12) h += 12
  if (schedAmPm.value === 'AM' && h === 12) h = 0
  const hStr = String(h).padStart(2, '0')
  form.scheduled_at = `${schedDate.value}T${hStr}:${schedMinute.value}`
}

function clearSchedule() {
  scheduleEnabled.value = false
  form.scheduled_at = ''
  schedDate.value = ''
}

function onScheduleToggle() {
  if (!scheduleEnabled.value) {
    form.scheduled_at = ''
    schedDate.value = ''
  } else {
    // default to tomorrow 8AM
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    schedDate.value = tomorrow.toISOString().split('T')[0]
    schedHour.value = '08'
    schedMinute.value = '00'
    schedAmPm.value = 'AM'
    buildScheduledAt()
  }
}

function formatSchedulePreview(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function loadScheduleFromIso(iso: string) {
  if (!iso) return
  const d = new Date(iso)
  schedDate.value = d.toISOString().split('T')[0]
  let h = d.getHours()
  schedAmPm.value = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  schedHour.value = String(h).padStart(2, '0')
  schedMinute.value = String(d.getMinutes()).padStart(2, '0')
  // snap minute to nearest 5
  const snapped = Math.round(d.getMinutes() / 5) * 5
  schedMinute.value = String(snapped === 60 ? 55 : snapped).padStart(2, '0')
  scheduleEnabled.value = true
}

const channels = [
  { value: 'email' as CampaignChannel, label: 'Email',    icon: 'mdi-email-outline' },
  { value: 'sms'   as CampaignChannel, label: 'SMS',      icon: 'mdi-message-text-outline' },
  { value: 'both'  as CampaignChannel, label: 'Both',     icon: 'mdi-layers-outline' },
]

const form = reactive({
  name:        '',
  domain_id:   undefined as number | undefined,
  channel:     'sms' as CampaignChannel,
  subject:     '',
  email_body:  '',
  email_field: 'email',
  sms_body:    '',
  phone_field: 'phone',
  scheduled_at: '',
})

// SMS character counting
const smsChars  = computed(() => (form.sms_body || '').length)
const smsPart   = computed(() => Math.ceil(smsChars.value / 160) || 1)
const smsPartColor = computed(() => {
  const rem = 160 - (smsChars.value % 160)
  if (rem > 40) return 'success'
  if (rem > 10) return 'warning'
  return 'error'
})

const selectedDomain = computed(() =>
  domainStore.domains.find(d => d.id === form.domain_id)
)

const canSend = computed(() => {
  if (!form.name || !form.domain_id) return false
  if ((form.channel === 'email' || form.channel === 'both') && (!form.subject || !form.email_body)) return false
  if ((form.channel === 'sms'   || form.channel === 'both') && !form.sms_body) return false
  return true
})

const validationHint = computed(() => {
  if (!form.domain_id) return 'Please select a mailing list.'
  if ((form.channel === 'email' || form.channel === 'both') && !form.subject) return 'Email subject is required.'
  if ((form.channel === 'email' || form.channel === 'both') && !form.email_body) return 'Email body is required.'
  if ((form.channel === 'sms'   || form.channel === 'both') && !form.sms_body)  return 'SMS body is required.'
  return ''
})

function buildPayload() {
  return {
    name:        form.name,
    domain_id:   form.domain_id!,
    channel:     form.channel,
    subject:     form.channel !== 'sms'   ? form.subject     : undefined,
    email_body:  form.channel !== 'sms'   ? form.email_body  : undefined,
    email_field: form.channel !== 'sms'   ? form.email_field : undefined,
    sms_body:    form.channel !== 'email' ? form.sms_body    : undefined,
    phone_field: form.channel !== 'email' ? form.phone_field : undefined,
    scheduled_at: form.scheduled_at || undefined,
  }
}

async function handleSave() {
  saving.value = true
  try {
    const payload = buildPayload()
    if (isEditing.value) {
      await campaignStore.update(campaignId.value!, payload)
    } else {
      const res = await campaignStore.create(payload)
      if (res) router.replace(`/compose/${res.id}`)
    }
    lastSaved.value = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } finally {
    saving.value = false
  }
}

function handleSend() {
  if (!canSend.value) return
  confirmSend.value = true
}

async function doSend() {
  sending.value = true
  try {
    // If not yet saved, create the draft first then send
    let id = campaignId.value
    if (!id) {
      const res = await campaignStore.create(buildPayload())
      if (!res) return
      id = res.id
    } else {
      await campaignStore.update(id, buildPayload())
    }
    const ok = await campaignStore.send(id)
    if (ok) router.push('/campaigns')
  } finally {
    sending.value = false
  }
}

function clearForm() {
  Object.assign(form, {
    name: '', domain_id: undefined, channel: 'sms',
    subject: '', email_body: '', email_field: 'email',
    sms_body: '', phone_field: 'phone', scheduled_at: '',
  })
  lastSaved.value = null
}

onMounted(async () => {
  await domainStore.fetchAll()

  if (campaignId.value) {
    const c = await campaignStore.fetchOne(campaignId.value)
    if (c) {
      form.name        = c.name
      form.domain_id   = c.domain_id
      form.channel     = c.channel
      form.subject     = c.subject     || ''
      form.email_body  = c.email_body  || ''
      form.email_field = c.email_field || 'email'
      form.sms_body    = c.sms_body    || ''
      form.phone_field = c.phone_field || 'phone'
      form.scheduled_at = c.scheduled_at || ''
      if (c.scheduled_at) loadScheduleFromIso(c.scheduled_at)
    }
  } else {
    // Auto-select mailing list when coming from /mailing-lists via "Use in Campaign"
    const domainParam = route.query.domain
    if (domainParam) {
      const domainId = Number(domainParam)
      if (!isNaN(domainId) && domainStore.domains.find(d => d.id === domainId)) {
        form.domain_id = domainId
      }
    }
  }
})
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

/* Channel buttons */
.channel-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  border-radius: 10px;
  border: 1.5px solid rgb(var(--v-theme-card-border));
  background: transparent;
  font-size: 13.5px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  color: rgba(var(--v-theme-on-surface), 0.55);
  cursor: pointer;
  transition: all 0.18s;
}
.channel-btn:hover {
  border-color: rgba(var(--v-theme-primary), 0.4);
  color: rgb(var(--v-theme-on-surface));
}
.channel-btn--active {
  background: rgb(var(--v-theme-primary)) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
  color: #fff !important;
  box-shadow: 0 4px 12px rgba(111,45,189,0.28);
}

/* Schedule picker */
.schedule-picker {
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.schedule-preview {
  background: rgba(var(--v-theme-primary), 0.06);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}
</style>
