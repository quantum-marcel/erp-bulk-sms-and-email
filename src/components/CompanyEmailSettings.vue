<template>
  <v-dialog :model-value="true" max-width="760" :fullscreen="$vuetify.display.smAndDown" :persistent="busy" @update:model-value="(value: boolean) => { if (!value) emit('close') }">
    <v-card rounded="lg">
      <v-card-title class="pa-6 pb-2">Email settings · {{ company.name }}</v-card-title>
      <v-card-text class="pa-6 pt-2">
        <p class="text-body-2 text-medium-emphasis mb-4">Configure the email accounts this company can use for campaigns.</p>
        <v-btn v-if="configs.length" variant="text" prepend-icon="mdi-plus" :disabled="busy" class="mb-3" @click="reset">Add Email Account</v-btn>
        <v-alert v-if="error" type="error" class="mb-3">{{ error }}</v-alert>
        <v-progress-linear v-if="busy" indeterminate />
        <v-list>
          <v-list-item v-for="config in configs" :key="config.id" :title="config.name" :subtitle="`${config.from_email || ''}${config.is_default ? ' · Default' : ''}${!config.enabled ? ' · Disabled' : ''}`">
            <template #append>
              <v-btn variant="text" :disabled="busy" @click="edit(config)">Edit</v-btn>
              <v-btn variant="text" :disabled="busy" @click="test(config.id)">Test</v-btn>
              <v-btn variant="text" color="error" :disabled="busy" @click="deleteTarget = config">Delete</v-btn>
            </template>
          </v-list-item>
        </v-list>
        <v-alert v-if="testResult" :type="testResult.ok ? 'success' : 'warning'" class="mb-3">{{ testResult.detail || (testResult.ok ? 'Connection successful' : 'Connection failed') }}</v-alert>
        <v-form id="company-email-settings" @submit.prevent="save">
          <fieldset :disabled="busy" style="border:0;padding:0">
            <h3 class="mb-3">{{ editingId ? 'Configure email account' : 'Set up email account' }}</h3>
            <v-text-field v-model="form.name" label="Account name *" />
            <v-text-field v-model="form.host" label="SMTP host *" />
            <v-row>
              <v-col><v-text-field v-model.number="form.port" type="number" label="Port *" /></v-col>
              <v-col><v-text-field v-model="form.encryption" label="Encryption" hint="Server-supported mode, e.g. starttls" persistent-hint /></v-col>
            </v-row>
            <v-text-field v-model="form.from_email" type="email" label="From email *" />
            <v-text-field v-model="form.from_name" label="From name" />
            <v-text-field v-model="form.username" label="SMTP username" autocomplete="off" />
            <v-text-field v-model="form.password" type="password" label="SMTP password" autocomplete="new-password" :hint="editingId ? 'Leave blank to keep the saved password.' : 'Required when a username is set.'" persistent-hint />
            <v-checkbox v-if="editingId" v-model="form.clear_password" label="Clear saved password (also clear username)" />
            <v-text-field v-model="form.timeout" type="number" label="Timeout (seconds, optional)" />
            <v-checkbox v-model="form.enabled" label="Enabled" hide-details />
            <v-checkbox v-model="form.is_default" label="Use as company default" />
          </fieldset>
        </v-form>
      </v-card-text>
      <v-card-actions class="px-6 pb-6 ga-2">
        <v-spacer />
        <v-btn variant="text" :disabled="busy" @click="emit('close')">Cancel</v-btn>
        <v-btn type="submit" form="company-email-settings" color="primary" variant="flat" rounded="lg" :loading="busy" :disabled="busy || !form.name.trim() || !form.host.trim() || !form.from_email.trim()">Save Settings</v-btn>
      </v-card-actions>
    </v-card>
    <ConfirmDialog :model-value="!!deleteTarget" title="Delete email account" :message="`Delete ${deleteTarget?.name || 'this account'}?`" confirm-label="Delete" color="error" @update:model-value="deleteTarget = null" @confirm="remove" />
  </v-dialog>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { get, post, patch, del } from '@/utils/http'
import type { Company } from '@/types/company'
import type { EmailConfigOut, EmailConfigTestOut } from '@/types/backend'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
const props = defineProps<{ company: Company }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const base = `/companies/${props.company.id}/email-configs`
const configs = ref<EmailConfigOut[]>([])
const busy = ref(false)
const error = ref('')
const testResult = ref<EmailConfigTestOut | null>(null)
const editingId = ref<number | null>(null)
const deleteTarget = ref<EmailConfigOut | null>(null)
const defaults = () => ({ name: '', host: '', port: 587, encryption: 'starttls', from_email: '', from_name: '', username: '', password: '', clear_password: false, timeout: '' as string | number, enabled: true, is_default: false })
const form = reactive(defaults())
function reset() { editingId.value = null; Object.assign(form, defaults()) }
function edit(config: EmailConfigOut) {
  reset()
  editingId.value = config.id
  Object.assign(form, { ...config, host: config.host ?? '', port: config.port ?? 587, encryption: config.encryption ?? 'starttls', from_email: config.from_email ?? '', from_name: config.from_name ?? '', username: config.username ?? '', timeout: config.timeout ?? '' })
}
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await action() } catch (e) { error.value = e instanceof Error ? e.message : 'Request failed' } finally { busy.value = false }
}
async function reload() { configs.value = await get<EmailConfigOut[]>(base) }
async function save() {
  await run(async () => {
    if (!form.name.trim() || !form.host.trim() || !form.from_email.trim()) throw Error('Account name, host and from email are required.')
    if (!Number.isInteger(form.port) || form.port < 1 || form.port > 65535) throw Error('Enter a valid SMTP port.')
    if (form.clear_password && (form.username.trim() || form.password)) throw Error('Clear the username and replacement password before clearing the saved password.')
    if (!editingId.value && form.username.trim() && !form.password) throw Error('Enter a password for this username.')
    const timeout = form.timeout === '' ? null : Number(form.timeout)
    if (timeout !== null && (!Number.isFinite(timeout) || timeout < 0)) throw Error('Enter a valid timeout.')
    const payload = { name: form.name.trim(), host: form.host.trim(), port: form.port, encryption: form.encryption, from_email: form.from_email.trim(), from_name: form.from_name.trim() || null, username: form.username.trim() || null, ...(form.password ? { password: form.password } : {}), ...(editingId.value && form.clear_password ? { clear_password: true } : {}), timeout, enabled: form.enabled, is_default: form.is_default }
    await (editingId.value
      ? patch<EmailConfigOut>(`${base}/${editingId.value}`, payload)
      : post<EmailConfigOut>(base, payload))
    form.password = ''
    form.clear_password = false
    emit('saved')
    emit('close')
  })
}
async function test(id: number) { await run(async () => { testResult.value = await post<EmailConfigTestOut>(`${base}/${id}/test`, {}) }) }
async function remove() {
  const id = deleteTarget.value?.id
  if (!id) return
  await run(async () => { await del(`${base}/${id}`); if (editingId.value === id) reset(); deleteTarget.value = null; emit('saved'); await reload() })
}
onMounted(() => run(reload))
</script>
