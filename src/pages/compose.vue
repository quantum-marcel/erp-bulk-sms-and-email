
<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-start align-sm-center justify-space-between mb-6 flex-wrap ga-2">
      <div>
        <h2 class="font-weight-bold" style="font-size:clamp(17px,4vw,22px)">
          {{ route.query.edit ? 'Edit Draft' : 'New Campaign' }}
        </h2>
        <p class="text-medium-emphasis text-body-2">
          {{ route.query.edit ? 'Update your campaign details and message.' : 'Create a new bulk messaging campaign.' }}
        </p>
      </div>
      <div class="d-flex align-center ga-2">
        <div v-if="lastSaved" class="d-flex align-center ga-1 text-caption text-medium-emphasis">
          <v-icon size="13">mdi-cloud-check-outline</v-icon>
          Saved {{ lastSaved }}
        </div>
      </div>
    </div>

    <v-alert v-if="route.query.clone" type="info" variant="tonal" class="mb-4">
      You are editing a copy. Saving or sending creates a new campaign; the original remains unchanged.
    </v-alert>
    <v-alert v-if="savedCampaignId && campaignStore.sendErrors[savedCampaignId]" type="error" variant="tonal" class="mb-4">
      {{ campaignStore.sendErrors[savedCampaignId] }}
      <v-btn variant="text" :to="`/campaign-detail-${savedCampaignId}`">Check Campaign</v-btn>
    </v-alert>

    <v-alert v-if="editError" type="error" class="mb-4">{{ editError }}</v-alert>
    <v-progress-linear v-if="editLoading" indeterminate color="primary" class="mb-4" />
    <p v-if="authStore.activeCompany" class="text-body-2 text-medium-emphasis mb-4">Sending as {{ authStore.activeCompany.name }}</p>
    <v-alert v-if="!authStore.isAdmin && !authStore.hasCompany" type="warning" variant="tonal" class="mb-4">Your account needs a company assignment before you can create campaigns. Contact an administrator.</v-alert>
    <fieldset v-if="hasCampaignCompany" :disabled="!hasCampaignCompany || editLoading || !!editError || saving || sending" style="border:0;padding:0;margin:0;min-width:0">
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

          <v-select v-model="form.email_field" :items="emailFields" label="Recipient email field" placeholder="Keep current email field" :persistent-hint="!!route.query.edit && !form.email_field" :hint="route.query.edit && !form.email_field ? 'Leave unchanged to keep the current email field.' : undefined" variant="outlined" rounded="lg" class="mb-3" :loading="partnersStore.loadingFields" />
          <v-select v-model="form.email_config_id" :items="emailConfigItems" label="Sending email account" placeholder="Use company default" clearable persistent-placeholder :loading="loadingEmailConfigs" variant="outlined" rounded="lg" class="mb-3" hint="Leave empty to use the company default." persistent-hint />
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

          <v-select v-model="form.sms_provider" :items="providerItems" item-title="title" item-value="id" label="SMS provider *" placeholder="Choose a provider" prepend-inner-icon="mdi-message-settings-outline" variant="outlined" rounded="lg" :loading="loadingProviders" :rules="[v => providers.some(p => p.id === v && p.configured) || 'Choose an available SMS provider']" class="mb-3" />
          <v-alert v-if="!loadingProviders && !providers.some(p => p.configured)" type="warning" variant="tonal" class="mb-3">No SMS provider is configured for this company. <v-btn variant="text" @click="loadProviders">Refresh providers</v-btn></v-alert>
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
          <div class="d-flex align-center ga-2 mt-1 flex-wrap">
            <v-chip size="x-small" color="primary" label variant="tonal">{{ smsPreview.encoding }} · {{ smsPreview.parts.length }} estimated part{{ smsPreview.parts.length === 1 ? '' : 's' }}</v-chip>
            <span class="text-caption text-medium-emphasis">{{ smsPreview.remaining }} units left in the current part</span>
          </div>
          <div v-if="smsPreview.parts.length" class="mt-4">
            <p class="text-subtitle-2 mb-2">SMS part preview</p>
            <v-card v-for="(part, index) in smsPreview.parts" :key="index" variant="outlined" rounded="lg" class="pa-3 mb-2">
              <p class="text-caption text-medium-emphasis mb-2">Part {{ index + 1 }} of {{ smsPreview.parts.length }} · {{ part.units }}/{{ smsPreview.capacity }} units</p>
              <div style="white-space:pre-wrap;overflow-wrap:anywhere">{{ part.text }}</div>
            </v-card>
            <p class="text-caption text-medium-emphasis">Estimated from the text above. Personalised values and provider formatting can change the splits. Phones usually combine the parts into one message.</p>
          </div>

        </v-card>

      </v-col>

      <!-- ── RIGHT: Domain + Actions ── -->
      <v-col cols="12" lg="5">

        <!-- Recipients -->
        <v-card rounded="xl" elevation="0" class="pa-5 mb-4 ng-card">
          <div class="d-flex align-center justify-space-between mb-3">
            <p class="font-weight-semibold text-body-1">Recipients</p>
            <v-btn
              v-if="form.recipientMode === 'domain'"
              variant="text"
              size="x-small"
              color="primary"
              prepend-icon="mdi-plus"
              to="/mailing-lists"
            >
              New list
            </v-btn>
          </div>

          <div class="d-flex ga-2 mb-3">
            <button
              class="channel-btn"
              :class="{ 'channel-btn--active': form.recipientMode === 'domain' }"
              @click="form.recipientMode = 'domain'"
            >
              <v-icon size="16" class="mr-1">mdi-account-group-outline</v-icon>
              Mailing List
            </button>
            <button
              class="channel-btn"
              :class="{ 'channel-btn--active': form.recipientMode === 'direct' }"
              @click="form.recipientMode = 'direct'"
            >
              <v-icon size="16" class="mr-1">mdi-account-plus-outline</v-icon>
              Direct Recipients
            </button>
          </div>

          <template v-if="form.recipientMode === 'domain'">
            <DomainSelect v-model="form.domain_id" @selected="selectedDomain = $event || undefined" />

            <div v-if="selectedDomain" class="mt-3 pa-3 rounded-lg" style="background: rgba(var(--v-theme-primary),0.06); border: 1px solid rgba(var(--v-theme-primary),0.15)">
              <p class="text-caption font-weight-semibold text-primary">{{ selectedDomain.name }}</p>
              <div class="d-flex align-center ga-2 mt-1">
                <template v-if="form.domain_id != null && previewStore.isLoading(form.domain_id)">
                  <v-progress-circular indeterminate size="12" width="2" color="primary" />
                  <span class="text-caption text-medium-emphasis">Checking matched recipients…</span>
                </template>
                <p v-else class="text-caption text-medium-emphasis">
                  <strong class="text-primary">{{ matchedCount === undefined ? '—' : matchedCount.toLocaleString() }}</strong>
                  recipient{{ matchedCount === 1 ? '' : 's' }} matched ·
                  {{ countRules(selectedDomain.rules) }} conditions
                </p>
              </div>
            </div>
          </template>

          <template v-else>
            <p class="text-caption text-medium-emphasis mb-3">
              Paste addresses separated by commas, spaces or new lines — bypasses mailing list rules entirely.
            </p>
            <template v-if="form.channel === 'email' || form.channel === 'both'">
              <div class="d-flex align-center justify-space-between">
                <label class="field-label">Email addresses</label>
                <v-btn size="x-small" variant="text" color="primary" prepend-icon="mdi-file-upload-outline" @click="emailCsvInput?.click()">
                  Upload CSV
                </v-btn>
              </div>
              <input ref="emailCsvInput" type="file" accept=".csv,text/csv" hidden @change="onCsvSelected($event, 'email')">
              <v-textarea
                v-model="form.direct_emails_text"
                placeholder="jane@example.com, john@example.com"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                rows="3"
                auto-grow
                hide-details="auto"
                class="mt-1 mb-3"
              />
              <p class="text-caption text-medium-emphasis mb-3">
                <strong class="text-primary">{{ directEmails.length.toLocaleString() }}</strong> email recipient{{ directEmails.length === 1 ? '' : 's' }}
              </p>
            </template>
            <template v-if="form.channel === 'sms' || form.channel === 'both'">
              <div class="d-flex align-center justify-space-between">
                <label class="field-label">Phone numbers</label>
                <v-btn size="x-small" variant="text" color="primary" prepend-icon="mdi-file-upload-outline" @click="phoneCsvInput?.click()">
                  Upload CSV
                </v-btn>
              </div>
              <input ref="phoneCsvInput" type="file" accept=".csv,text/csv" hidden @change="onCsvSelected($event, 'phone')">
              <v-textarea
                v-model="form.direct_phones_text"
                placeholder="+233241234567, +233551234567"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                rows="3"
                auto-grow
                hide-details="auto"
                class="mt-1 mb-3"
              />
              <p class="text-caption text-medium-emphasis mb-3">
                <strong class="text-primary">{{ directPhones.length.toLocaleString() }}</strong> phone recipient{{ directPhones.length === 1 ? '' : 's' }}
              </p>
            </template>
          </template>
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
              :true-value="false"
              :false-value="true"
              aria-label="Send Immediately"
              color="primary"
              hide-details
              density="compact"
              @change="onScheduleToggle"
            />
            <span class="text-body-2" :class="!scheduleEnabled ? 'font-weight-medium' : 'text-medium-emphasis'">
              {{ scheduleEnabled ? 'Send at a specific time' : 'Send Immediately' }}
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
              :disabled="!form.name.trim() || !hasRecipients || saving || sending"
              @click="handleSave"
            >
              {{ savedCampaignId ? 'Save Changes' : 'Save as Draft' }}
            </v-btn>

            <!-- Send now -->
            <v-btn
              block size="large" rounded="xl" elevation="0"
              color="primary"
              prepend-icon="mdi-send"
              :loading="sending"
              :disabled="!canSend || saving || sending"
              style="font-weight:700"
              @click="handleSend"
            >
              {{ form.scheduled_at ? 'Schedule Campaign' : 'Send Now' }}
            </v-btn>

            <!-- Clear -->
            <v-btn
              block rounded="xl" variant="text" color="error"
              prepend-icon="mdi-delete-outline"
              :disabled="saving || sending || (!form.name && !form.email_body && !form.sms_body)"
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
    </fieldset>
    <ConfirmDialog
      v-model="confirmSend"
      title="Send Campaign"
      :message="`Send '${form.name}'${authStore.isAdmin ? ' from ' + authStore.activeCompany?.name : ''} to ${form.recipientMode === 'domain' ? 'all recipients in the selected mailing list' : 'the entered recipients'}?`"
      confirm-label="Send Campaign"
      icon="mdi-send"
      color="primary"
      @confirm="doSend"
    />
  </div>
</template>

<script lang="ts" setup>
import DomainSelect from '@/components/DomainSelect.vue'
import { countRules } from '@/utils/domainRules'
import { parseCsv, extractCsvColumn } from '@/utils/contactCsv'
import { smsParts } from '@/utils/smsParts'
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCampaignStore } from '@/stores/campaign'
import { usePreviewStore } from '@/stores/preview'
import TiptapEditor from '@/components/compose/TiptapEditor.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { usePartnersStore } from '@/stores/partners'
import { get } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import { useUiStore } from '@/stores/ui'
import type { EmailConfigOption } from '@/types/backend'
import type { SmsProvider } from '@/types/sms'
import type { CampaignChannel } from '@/types/sms'

const route    = useRoute()
const router   = useRouter()
const authStore = useAuthStore()
const campaignStore = useCampaignStore()
const previewStore  = usePreviewStore()

const partnersStore = usePartnersStore()
const providers = ref<SmsProvider[]>([])
const loadingProviders = ref(false)
const editLoading = ref(!!route.query.edit)
const editError = ref('')
const contactFields = computed(() => partnersStore.fields.filter(f => f.supported && f.name !== 'id' && /^(char|text)$/i.test(f.ttype || '')).map(f => ({ title: f.label || f.name, value: f.name })))
const emailFields = computed(() => [{ title: 'Email (email)', value: 'email' }, ...contactFields.value.filter(f => f.value !== 'email')])
const providerItems = computed(() => providers.value.filter(p => p.configured).map(p => ({ ...p, title: `${p.label}${p.is_default ? ' · Default' : ''}` })))
let providerRequest = 0
async function loadProviders() {
  const request = ++providerRequest
  const companyId = authStore.activeCompany?.id
  providers.value = []
  loadingProviders.value = true
  if (!companyId) { loadingProviders.value = false; return }
  const { run } = useApiCall()
  const result = await run(() => get<SmsProvider[]>('/sms/providers'))
  if (request !== providerRequest || authStore.activeCompany?.id !== companyId) return
  providers.value = result || []
  loadingProviders.value = false
}
const emailConfigs = ref<EmailConfigOption[]>([])
const loadingEmailConfigs = ref(false)
const emailConfigItems = computed(() => emailConfigs.value.filter(c => c.configured).map(c => ({ title: `${c.name}${c.is_default ? ' · Default' : ''}`, value: c.id })))
let emailConfigRequest = 0
async function loadEmailConfigs() {
  const request = ++emailConfigRequest
  const companyId = authStore.activeCompany?.id
  emailConfigs.value = []
  loadingEmailConfigs.value = true
  if (!companyId) { loadingEmailConfigs.value = false; return }
  const { run } = useApiCall()
  const result = await run(() => get<EmailConfigOption[]>('/email/configs'))
  if (request !== emailConfigRequest || authStore.activeCompany?.id !== companyId) return
  emailConfigs.value = result || []
  loadingEmailConfigs.value = false
}
const saving      = ref(false)
const sending     = ref(false)
const confirmSend = ref(false)
const lastSaved   = ref<string | null>(null)
const savedCampaignId = ref<number | null>(null)
const savedPayload = ref('')
const hasCampaignCompany = computed(() => authStore.hasCompany)

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
const minuteItems = Array.from({ length: 60 }, (_, i) => { const m = String(i).padStart(2, '0'); return { title: m, value: m } })

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
  schedDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  let h = d.getHours()
  schedAmPm.value = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  schedHour.value = String(h).padStart(2, '0')
  schedMinute.value = String(d.getMinutes()).padStart(2, '0')
  scheduleEnabled.value = true
}

const channels = [
  { value: 'email' as CampaignChannel, label: 'Email',    icon: 'mdi-email-outline' },
  { value: 'sms'   as CampaignChannel, label: 'SMS',      icon: 'mdi-message-text-outline' },
  { value: 'both'  as CampaignChannel, label: 'Both',     icon: 'mdi-layers-outline' },
]

const form = reactive({
  name:        '',
  recipientMode: 'domain' as 'domain' | 'direct',
  domain_id:   undefined as number | undefined,
  direct_emails_text: '',
  direct_phones_text: '',
  channel:     'sms' as CampaignChannel,
  subject:     '',
  email_body:  '',
  sms_body:    '',
  scheduled_at: '',
  sms_provider: null as string | null,
  email_config_id: null as number | null,
  phone_field: 'phone',
  email_field: 'email',
})

// Split pasted text on commas / semicolons / whitespace into a deduped list.
function parseRecipientList(text: string): string[] {
  const seen = new Set<string>()
  for (const raw of text.split(/[\s,;]+/)) {
    const value = raw.trim()
    if (value) seen.add(value)
  }
  return [...seen]
}

const directEmails = computed(() => parseRecipientList(form.direct_emails_text))
const directPhones = computed(() => parseRecipientList(form.direct_phones_text))

// ── CSV upload for direct recipients ───────────────────────────────────────
const emailCsvInput = ref<HTMLInputElement | null>(null)
const phoneCsvInput = ref<HTMLInputElement | null>(null)

async function onCsvSelected(event: Event, kind: 'email' | 'phone') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const ui = useUiStore()
  const singular = kind === 'email' ? 'email address' : 'phone number'
  const plural = kind === 'email' ? 'email addresses' : 'phone numbers'
  try {
    const values = extractCsvColumn(parseCsv(await file.text()), kind)
    if (!values.length) { ui.toast(`No ${plural} found in that file.`, 'warning'); return }
    const key = kind === 'email' ? 'direct_emails_text' : 'direct_phones_text'
    form[key] = form[key] ? `${form[key]}, ${values.join(', ')}` : values.join(', ')
    ui.toast(`Added ${values.length} ${values.length === 1 ? singular : plural} from CSV.`, 'success')
  } catch {
    ui.toast('Could not read that CSV file.', 'error')
  }
}

const hasRecipients = computed(() => {
  if (form.recipientMode === 'domain') return !!form.domain_id
  if (form.channel === 'email') return directEmails.value.length > 0
  if (form.channel === 'sms') return directPhones.value.length > 0
  return directEmails.value.length > 0 && directPhones.value.length > 0
})

watch(() => authStore.activeCompany?.id, async (companyId, previousId) => {
  if (companyId === previousId) return
  clearForm()
  confirmSend.value = false
  await Promise.all([loadProviders(), loadEmailConfigs()])
})

// SMS character counting
const smsPreview = computed(() => smsParts(form.sms_body || ''))

const selectedDomain = ref<import('@/types/sms').Domain>()

const matchedCount = computed(() =>
  form.domain_id !== undefined ? previewStore.results[form.domain_id]?.total_matched : undefined
)

watch(() => form.domain_id, (id) => {
  if (id !== undefined && previewStore.results[id] === undefined) {
    previewStore.preview(id)
  }
})

const canSend = computed(() => {
  if (!hasCampaignCompany.value || authStore.isLoading || editLoading.value || editError.value || !form.name.trim() || !hasRecipients.value) return false
  if (form.channel !== 'email' && (loadingProviders.value || !providers.value.some(p => p.id === form.sms_provider && p.configured))) return false
  if (form.channel !== 'sms' && form.email_config_id != null && (loadingEmailConfigs.value || !emailConfigs.value.some(c => c.id === form.email_config_id && c.configured))) return false
  if ((form.channel === 'email' || form.channel === 'both') && (!form.subject || !form.email_body)) return false
  if ((form.channel === 'sms'   || form.channel === 'both') && !form.sms_body) return false
  return true
})

const validationHint = computed(() => {
  if (!hasRecipients.value) {
    if (form.recipientMode === 'domain') return 'Please select a mailing list.'
    if (form.channel === 'both') return 'Enter at least one email address and one phone number.'
    return form.channel === 'email' ? 'Enter at least one email address.' : 'Enter at least one phone number.'
  }
  if (form.channel !== 'email' && !providers.value.some(p => p.id === form.sms_provider && p.configured)) return 'Please select an available SMS provider.'
  if (form.channel !== 'sms' && form.email_config_id != null && !emailConfigs.value.some(c => c.id === form.email_config_id && c.configured)) return 'Choose an available email account or clear the selection to use the company default.'
  if ((form.channel === 'email' || form.channel === 'both') && !form.subject) return 'Email subject is required.'
  if ((form.channel === 'email' || form.channel === 'both') && !form.email_body) return 'Email body is required.'
  if ((form.channel === 'sms'   || form.channel === 'both') && !form.sms_body)  return 'SMS body is required.'
  return ''
})

function buildPayload() {
  const isDirect = form.recipientMode === 'direct'
  return {
    name:        form.name,
    domain_id:   isDirect ? null : form.domain_id!,
    direct_emails: isDirect ? directEmails.value : null,
    direct_phones: isDirect ? directPhones.value : null,
    channel:     form.channel,
    subject:     form.channel !== 'sms'   ? form.subject || null : null,
    email_body:  form.channel !== 'sms'   ? form.email_body || null : null,
    sms_body:    form.channel !== 'email' ? form.sms_body || null : null,
    scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
    sms_provider: form.channel !== 'email' ? form.sms_provider : null,
    email_field: form.email_field || undefined,
    email_config_id: form.channel !== 'sms' ? form.email_config_id : null,
    phone_field: form.phone_field || undefined,
  }
}

async function saveDraft(notify = true) {
  if (!hasCampaignCompany.value) { useUiStore().toast('Select a company before saving this campaign.', 'warning'); return null }
  const payload = buildPayload()
  const snapshot = JSON.stringify(payload)
  if (savedCampaignId.value && savedPayload.value === snapshot) return savedCampaignId.value
  if (savedCampaignId.value) {
    const existing = await campaignStore.fetchOne(savedCampaignId.value)
    if (!existing || existing.status !== 'draft') {
      useUiStore().toast('Only draft campaigns can be edited. Check campaign status.', 'error')
      return null
    }
  }
  const campaign = savedCampaignId.value
    ? await campaignStore.update(savedCampaignId.value, payload, notify)
    : await campaignStore.create(payload, notify)
  if (!campaign) return null
  savedCampaignId.value = campaign.id
  savedPayload.value = snapshot
  lastSaved.value = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return campaign.id
}

async function handleSave() {
  if (saving.value || sending.value || !form.name.trim() || !hasRecipients.value) return
  saving.value = true
  try {
    await saveDraft()
  } finally {
    saving.value = false
  }
}

function handleSend() {
  if (!canSend.value) return
  confirmSend.value = true
}

async function doSend() {
  if (saving.value || sending.value || !canSend.value) return
  sending.value = true
  try {
    const id = await saveDraft(false)
    if (!id) return
    const ok = await campaignStore.send(id)
    if (ok) router.push(`/campaign-detail-${id}`)
  } finally {
    sending.value = false
  }
}

function clearForm() {
  Object.assign(form, {
    name: '', recipientMode: 'domain', domain_id: undefined,
    direct_emails_text: '', direct_phones_text: '', channel: 'sms',
    subject: '', email_body: '',
    sms_body: '', scheduled_at: '', sms_provider: null, email_config_id: null, phone_field: 'phone', email_field: 'email',
  })
  lastSaved.value = null
  if (route.query.edit) router.replace('/compose')
  savedCampaignId.value = null
  savedPayload.value = ''
  clearSchedule()
}

async function loadCampaignForm() {
  if (!hasCampaignCompany.value) return
  await Promise.all([partnersStore.fetchFields(authStore.activeCompany!.id), loadProviders(), loadEmailConfigs()])
  if (route.query.edit) {
    try {
      const id = Number(route.query.edit)
      const c = Number.isInteger(id) && id > 0 ? await campaignStore.fetchOne(id) : null
      if (!c || c.status !== 'draft') { editError.value = 'This campaign cannot be edited. Only existing drafts can be updated.'; return }
      Object.assign(form, {
        name: c.name,
        recipientMode: c.domain_id != null ? 'domain' : 'direct',
        domain_id: c.domain_id ?? undefined,
        direct_emails_text: (c.direct_emails || []).join(', '),
        direct_phones_text: (c.direct_phones || []).join(', '),
        email_config_id: c.email_config_id ?? null, phone_field: c.phone_field || '',
        channel: c.channel, subject: c.subject || '', email_body: c.email_body || '', sms_body: c.sms_body || '', sms_provider: c.sms_provider || null, email_field: c.email_field || '', scheduled_at: '',
      })
      if (c.scheduled_at) { loadScheduleFromIso(c.scheduled_at); buildScheduledAt() }
      savedCampaignId.value = c.id
      savedPayload.value = JSON.stringify(buildPayload())
    } finally { editLoading.value = false }
    return
  }

  const cloneParam = route.query.clone
  if (cloneParam) {
    // Duplicate an existing campaign's content into a fresh draft (see
    // "Duplicate" action on the campaign detail page). Intentionally leaves
    // scheduled_at unset — a copy shouldn't inherit the original's schedule.
    const cloneId = Number(cloneParam)
    const c = !isNaN(cloneId) ? await campaignStore.fetchOne(cloneId) : null
    if (c) {
      form.name       = `${c.name} (Copy)`
      form.recipientMode = c.domain_id != null ? 'domain' : 'direct'
      form.domain_id  = c.domain_id ?? undefined
      form.direct_emails_text = (c.direct_emails || []).join(', ')
      form.direct_phones_text = (c.direct_phones || []).join(', ')
      form.channel    = c.channel
      form.subject    = c.subject    || ''
      form.email_body = c.email_body || ''
      form.sms_body   = c.sms_body   || ''
      form.email_config_id = c.email_config_id ?? null
      form.phone_field = c.phone_field || 'phone'
      form.sms_provider = c.sms_provider || null
      form.email_field = c.email_field || 'email'
    }
    return
  }

  // Auto-select mailing list when coming from /mailing-lists via "Use in Campaign"
  const domainParam = route.query.domain
  if (domainParam) {
    const domainId = Number(domainParam)
    if (Number.isInteger(domainId) && domainId > 0) {
      form.domain_id = domainId
    }
  }
}

onMounted(loadCampaignForm)
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
