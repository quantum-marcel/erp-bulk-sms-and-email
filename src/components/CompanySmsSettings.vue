<template>
  <v-dialog
    :model-value="true"
    max-width="760"
    :fullscreen="$vuetify.display.smAndDown"
    :persistent="saving"
    @update:model-value="(v: boolean) => { if (!v) close() }"
  >
    <v-card rounded="lg">
      <v-card-title class="pa-6 pb-2">SMS providers · {{ company.name }}</v-card-title>
      <v-card-text class="pa-6 pt-2">
        <p class="text-body-2 text-medium-emphasis mb-4">Configure the providers this company can use for SMS campaigns.</p>
        <v-progress-linear v-if="loading" indeterminate color="primary" />
        <v-alert v-if="loadError" type="error" variant="tonal" class="mb-4">Could not load provider settings. <v-btn variant="text" @click="load">Retry</v-btn></v-alert>
        <template v-if="!loading && !loadError">
          <p class="text-caption font-weight-semibold text-uppercase text-medium-emphasis mb-2" style="letter-spacing:0.6px">Select a provider to configure</p>
          <div class="d-flex ga-2 flex-wrap mb-5">
            <v-chip
              v-for="config in configs"
              :key="config.provider"
              :color="provider === config.provider ? 'primary' : config.configured ? 'success' : 'default'"
              :variant="provider === config.provider ? 'flat' : 'tonal'"
              :disabled="saving"
              @click="provider = config.provider"
            >
              <v-icon v-if="provider === config.provider" size="15" class="mr-1">mdi-check-circle</v-icon>
              {{ config.label }} · {{ config.configured ? 'Configured' : 'Needs setup' }}{{ config.is_default ? ' · Default' : '' }}
            </v-chip>
          </div>
          <template v-if="provider">
            <v-alert v-if="current?.configured" type="success" variant="tonal" density="compact" class="mb-4">This provider is configured for {{ company.name }}.</v-alert>
            <v-row dense>
              <v-col cols="12"><v-text-field v-model="form.endpoint" label="API URL" :rules="[v => !!v?.trim() || 'API URL is required']" placeholder="https://…" variant="outlined" :disabled="saving" ><template #label>API URL <span class="text-error">*</span></template></v-text-field></v-col>
              <v-col v-if="isQuantum" cols="12">
                <v-text-field v-model="form.webhook_url" label="Webhook URL" placeholder="https://your-api.example/webhooks/quantum-sms" hint="Optional delivery-status callback URL. Use your public backend URL ending in /webhooks/quantum-sms." persistent-hint variant="outlined" :disabled="saving" />
              </v-col>
              <v-col cols="12" sm="6"><v-text-field v-model="form.sender_id" label="Sender name" hint="Leave empty to use the default sender ID." persistent-hint variant="outlined" :disabled="saving" /></v-col>
              <v-col v-if="!isQuantum" cols="12" sm="6"><v-text-field v-model="form.auth_name" :label="authLabel" :rules="[v => !!v?.trim() || `${authLabel} is required`]" variant="outlined" :disabled="saving" ><template #label>{{ authLabel }} <span class="text-error">*</span></template></v-text-field></v-col>
              <v-col cols="12">
                <v-text-field v-model="form.secret" :label="secretLabel" :placeholder="current?.configured ? '•••• (leave blank to keep)' : undefined" :rules="[v => current?.configured || !!v?.trim() || `${secretLabel} is required`]" type="password" autocomplete="new-password" variant="outlined" :disabled="saving || form.clear_secret" :hint="current?.configured ? 'Leave empty to keep the saved credential.' : 'Enter the secret supplied by your provider.'" persistent-hint><template #label>{{ secretLabel }} <span v-if="!current?.configured" class="text-error">*</span></template></v-text-field>
                <p v-if="current?.secret_preview" class="text-caption text-medium-emphasis">Saved secret: {{ current.secret_preview }}</p>
                <v-checkbox v-if="current?.configured" v-model="form.clear_secret" label="Clear saved credential" color="error" :disabled="saving || !!form.secret" hide-details />
              </v-col>
              <v-col cols="12"><v-checkbox v-model="form.is_default" label="Use as this company’s default SMS provider" color="primary" :disabled="saving" hide-details /></v-col>
            </v-row>
            <v-alert v-if="error" type="error" variant="tonal" class="mt-4">{{ error }}</v-alert>
          </template>
        </template>
      </v-card-text>
      <v-card-actions class="px-6 pb-6 ga-2">
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn color="primary" variant="flat" rounded="lg" :loading="saving" :disabled="saving || loading || loadError || !canSave" @click="save">Save Provider</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { buildSmsConfigPayload, isQuantumProvider, type SmsConfigForm } from '@/utils/smsConfig'
import type { Company, SmsConfig } from '@/types/company'

const props = defineProps<{ company: Company }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const store = useCompanyStore()
const configs = ref<SmsConfig[]>([])
const provider = ref('')
const loading = ref(true)
const loadError = ref(false)
const saving = ref(false)
const error = ref('')
const providerOptions = computed(() => Array.from(new Map(
  configs.value.map(c => [c.provider, { provider: c.provider, label: c.label }])
).values()))
const current = computed(() => configs.value.find(c => c.provider === provider.value))
const form = reactive<SmsConfigForm>({ endpoint: '', sender_id: '', auth_name: '', secret: '', clear_secret: false, timeout: null, webhook_url: '', extra: '', is_default: false })
const isQuantum = computed(() => isQuantumProvider(provider.value))
const authLabel = computed(() => provider.value === 'hubtel' ? 'Client ID' : 'Username')
const secretLabel = computed(() => isQuantum.value ? 'API Key' : provider.value === 'hubtel' ? 'Client Secret' : 'Password')
const canSave = computed(() => {
  try { buildSmsConfigPayload(form, { provider: provider.value, configured: !!current.value?.configured }); return true }
  catch { return false }
})
function resetForm() {
  const c = current.value
  Object.assign(form, { endpoint: c?.endpoint || '', sender_id: c?.sender_id || '', auth_name: c?.auth_name || '', secret: '', clear_secret: false, timeout: c?.timeout ?? null, webhook_url: typeof c?.extra?.webhook_url === 'string' ? c.extra.webhook_url : '', extra: c?.extra ? JSON.stringify(c.extra, null, 2) : '', is_default: c?.is_default || false })
  error.value = ''
}
watch(provider, resetForm)
async function load() {
  loading.value = true
  loadError.value = false
  const result = await store.fetchSmsConfigs(props.company.id)
  if (result) {
    configs.value = result
    if (!provider.value) provider.value = result.find(c => c.is_default)?.provider || providerOptions.value[0]?.provider || ''
    resetForm()
  } else loadError.value = true
  loading.value = false
}
async function save() {
  if (saving.value || !provider.value || loadError.value) return
  error.value = ''
  let payload
  try { payload = buildSmsConfigPayload(form, { provider: provider.value, configured: !!current.value?.configured }) }
  catch (err) { error.value = err instanceof Error ? err.message : 'Check provider settings.'; return }
  saving.value = true
  try {
    const result = await store.saveSmsConfig(props.company.id, provider.value, payload)
    if (!result) { error.value = 'Provider settings could not be saved. Check the details and try again.'; return }
    form.secret = ''
    form.clear_secret = false
    emit('saved')
    close()
  } finally { saving.value = false }
}
function close() { form.secret = ''; emit('close') }
onMounted(load)
onBeforeUnmount(() => { form.secret = '' })
</script>
