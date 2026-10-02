<template>
  <v-dialog :model-value="true" max-width="740" :persistent="busy" @update:model-value="value => { if (!value) emit('close') }">
    <v-card rounded="lg">
      <v-card-title class="pa-6 pb-2">Odoo settings · {{ company.name }}</v-card-title>
      <v-card-text class="pa-6 pt-2">
        <v-alert v-if="error" type="error" class="mb-3">{{ error }}</v-alert>
        <v-alert v-if="message" :type="messageOk ? 'success' : 'warning'" class="mb-3">{{ message }}</v-alert>
        <v-progress-linear v-if="busy" indeterminate class="mb-3" />
        <v-form id="odoo-settings" @submit.prevent="save">
          <fieldset :disabled="busy || !loaded" style="border:0;padding:0;min-width:0">
            <p class="text-body-2 mb-4">Connect this company's Odoo account to query recipient data and load fields for mailing-list rules.</p>
            <v-text-field v-model="form.source_url" label="Odoo URL" placeholder="https://odoo.example.com" />
            <v-text-field v-model="form.source_db" label="Database" />
            <v-text-field v-model="form.source_username" label="Odoo username" autocomplete="off" />
            <v-select v-model="credentialMode" :items="[{ title: 'Use an API key', value: 'key' }, { title: 'Generate a key using my password', value: 'password' }]" label="Authentication" />
            <v-text-field v-if="credentialMode === 'key'" v-model="form.api_key" type="password" autocomplete="new-password" label="Odoo API key" :disabled="form.clear_key" hint="Leave blank to keep the saved key." persistent-hint />
            <v-text-field v-else v-model="password" type="password" autocomplete="new-password" label="Odoo password" hint="Used once by the backend to generate an Odoo API key." persistent-hint />
            <p v-if="source?.key_preview" class="text-caption mb-2">Saved key: {{ source.key_preview }}</p>
            <v-checkbox v-if="credentialMode === 'key' && source?.key_preview" v-model="form.clear_key" label="Clear saved Odoo key" />
            <v-text-field v-model="form.timeout" type="number" min="1" label="Timeout in seconds (optional)" />
            <v-switch v-model="form.enabled" label="Enable Odoo source" color="primary" />
          </fieldset>
        </v-form>
        <div class="d-flex ga-2 flex-wrap mb-5">
          <v-btn :disabled="busy || !source?.configured" @click="testConnection">Test saved connection</v-btn>
          <v-btn :disabled="busy || !source?.configured || !source?.enabled" @click="refreshFields">Refresh Odoo fields</v-btn>
          <v-btn v-if="!loaded" :disabled="busy" @click="run(reload)">Reload settings</v-btn>
        </div>
        <v-divider class="mb-4" />
        <h3 class="text-subtitle-1 mb-2">Odoo sync key</h3>
        <p class="text-body-2 mb-3">Use this separate company key in Odoo to push data into the campaign service. Rotating it immediately replaces the previous key.</p>
        <v-text-field v-if="syncKey" :model-value="syncKey" readonly label="New sync key — copy before closing" />
        <div class="d-flex ga-2">
          <v-btn :disabled="busy" @click="confirmKey = true">{{ hasSyncKey ? 'Rotate sync key' : 'Generate sync key' }}</v-btn>
          <v-btn v-if="hasSyncKey" :disabled="busy" color="error" variant="text" @click="confirmRevoke = true">Revoke sync key</v-btn>
        </div>
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn :disabled="busy" @click="emit('close')">Close</v-btn>
        <v-btn form="odoo-settings" type="submit" color="primary" variant="flat" :disabled="busy || !loaded" :loading="busy">Save Odoo settings</v-btn>
      </v-card-actions>
    </v-card>
    <ConfirmDialog v-model="confirmKey" title="Generate sync key" :message="hasSyncKey ? 'The old sync key will stop working immediately. Update Odoo with the new key after generating it.' : 'Generate a company sync key for Odoo?'" confirm-label="Generate" @confirm="generateKey" />
    <ConfirmDialog v-model="confirmRevoke" title="Revoke sync key" message="Odoo will no longer be able to push data using this key." confirm-label="Revoke" color="error" @confirm="revokeKey" />
  </v-dialog>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { get, put, post, del } from '@/utils/http'
import { usePartnersStore } from '@/stores/partners'
import { useAuthStore } from '@/stores/auth'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { Company } from '@/types/company'
import type { OdooSourceOut, OdooSourceTestOut, OdooSourceProvisionOut, CompanyApiKeyOut, PartnerFieldsOut } from '@/types/backend'
const props = defineProps<{ company: Company }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const base = `/companies/${props.company.id}`
const source = ref<OdooSourceOut | null>(null)
const busy = ref(false)
const loaded = ref(false)
const error = ref('')
const message = ref('')
const messageOk = ref(true)
const credentialMode = ref('key')
const password = ref('')
const syncKey = ref('')
const hasSyncKey = ref(props.company.has_api_key)
const confirmKey = ref(false)
const confirmRevoke = ref(false)
const form = reactive({ source_url: '', source_db: '', source_username: '', api_key: '', clear_key: false, timeout: '' as string | number, enabled: true })
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''; message.value = ''; messageOk.value = true
  try { await action() } catch (e) { error.value = e instanceof Error ? e.message : 'Could not update Odoo settings.' } finally { busy.value = false }
}
async function reload() {
  source.value = await get<OdooSourceOut>(`${base}/source`)
  const s = source.value
  Object.assign(form, { source_url: s.source_url || '', source_db: s.source_db || '', source_username: s.source_username || '', timeout: s.timeout ?? '', enabled: s.configured || s.updated_at ? s.enabled : true, api_key: '', clear_key: false })
  loaded.value = true
}
async function save() {
  await run(async () => {
    const timeout = form.timeout === '' ? undefined : Number(form.timeout)
    if (timeout != null && (!Number.isFinite(timeout) || timeout <= 0)) throw new Error('Enter a positive timeout.')
    const credentials = { source_url: form.source_url.trim(), source_db: form.source_db.trim(), source_username: form.source_username.trim(), timeout, enabled: form.enabled }
    if (credentials.source_url) {
      const url = new URL(credentials.source_url)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS Odoo URL.')
    }
    if (form.enabled && (!credentials.source_url || !credentials.source_db || !credentials.source_username)) throw new Error('URL, database and username are required to enable Odoo.')
    if (credentialMode.value === 'password') {
      if (!password.value) throw new Error('Enter your Odoo password to generate a key.')
      const result = await post<OdooSourceProvisionOut>(`${base}/source/provision-key`, { ...credentials, password: password.value })
      password.value = ''
      message.value = result.detail || 'Odoo key provisioned.'
      messageOk.value = result.configured
      if (!result.configured) return
    } else {
      if (form.enabled && (form.clear_key || (!form.api_key && !source.value?.key_preview && !source.value?.configured))) throw new Error('Provide an API key or disable the source before clearing its key.')
      await put<OdooSourceOut>(`${base}/source`, { ...credentials, ...(form.clear_key ? { clear_key: true } : form.api_key ? { api_key: form.api_key } : {}) })
      form.api_key = ''
      message.value = 'Odoo settings saved.'
    }
    emit('saved')
    emit('close')
  })
}
async function testConnection() { await run(async () => {
  const result = await post<OdooSourceTestOut>(`${base}/source/test`)
  messageOk.value = result.ok
  message.value = result.detail || (result.ok ? `Connected${result.odoo_version ? ' to Odoo ' + result.odoo_version : ''}.` : 'Connection failed.')
}) }
async function refreshFields() { await run(async () => {
  const result = await post<PartnerFieldsOut>(`${base}/source/refresh-fields`)
  if (useAuthStore().activeCompany?.id === props.company.id) await usePartnersStore().fetchFields(props.company.id, true)
  message.value = `Loaded ${result.fields.length} Odoo fields.`
}) }
async function generateKey() { confirmKey.value = false; await run(async () => {
  const result = await post<CompanyApiKeyOut>(`${base}/api-key`)
  syncKey.value = result.api_key; hasSyncKey.value = true; emit('saved')
}) }
async function revokeKey() { confirmRevoke.value = false; await run(async () => {
  await del(`${base}/api-key`); syncKey.value = ''; hasSyncKey.value = false; emit('saved')
}) }
onMounted(() => run(reload))
</script>
