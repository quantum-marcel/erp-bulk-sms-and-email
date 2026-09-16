<template>
  <div>
    <div class="d-flex align-start align-sm-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="admin-heading">Companies</h2>
        <p class="admin-sub">Create and maintain company workspaces.</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" rounded="lg" elevation="0" @click="openCreate">
        New Company
      </v-btn>
    </div>

    <v-card class="ng-card" rounded="lg">
      <v-data-table
        :headers="headers"
        :items="companyStore.companies"
        :loading="companyStore.isLoading"
        item-value="id"
        class="admin-table"
      >
        <template #item.name="{ item }">
          <div class="py-2">
            <p class="font-weight-semibold">{{ item.name }}</p>
            <p class="text-caption text-medium-emphasis">Company #{{ item.id }}</p>
          </div>
        </template>

        <template #item.created_at="{ item }">
          <span class="text-body-2">{{ formatDate(item.created_at) }}</span>
        </template>

        <template #item.default_sms_provider="{ item }">
          <span class="text-body-2">{{ providerName(item.default_sms_provider) }}</span>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn size="small" variant="tonal" prepend-icon="mdi-message-settings-outline" @click="smsCompany = item">Configure Providers</v-btn>
            <v-btn icon size="small" variant="text" @click="openEdit(item)">
              <v-icon size="17">mdi-pencil-outline</v-icon>
              <v-tooltip activator="parent" location="top">Edit</v-tooltip>
            </v-btn>
            <v-btn icon size="small" variant="text" color="error" @click="confirmDelete(item)">
              <v-icon size="17">mdi-trash-can-outline</v-icon>
              <v-tooltip activator="parent" location="top">Delete</v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="showDialog" :max-width="620" :fullscreen="$vuetify.display.smAndDown" persistent>
      <v-card :rounded="$vuetify.display.smAndDown ? '0' : 'lg'" elevation="8">
        <v-card-title class="pa-6 pb-2 font-weight-bold">
          {{ editTarget ? 'Edit Company' : 'New Company' }}
        </v-card-title>
        <v-card-text class="pa-6 pt-2">
          <v-text-field v-model="form.name" label="Company Name *" variant="outlined" density="comfortable" rounded="lg" hide-details />
        </v-card-text>
        <v-card-actions class="px-6 pb-6 pt-0 ga-2">
          <v-spacer />
          <v-btn variant="tonal" rounded="lg" @click="showDialog = false">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" elevation="0" :loading="saving" :disabled="!form.name" @click="save">
            {{ editTarget ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <CompanySmsSettings v-if="smsCompany" :key="smsCompany.id" :company="smsCompany" @close="smsCompany = null" @saved="companyStore.fetchAll(true)" />
    <ConfirmDialog
      v-model="showDelete"
      title="Delete Company"
      :message="`Delete ${deleteTarget?.name || 'this company'} permanently?`"
      confirm-label="Delete"
      icon="mdi-trash-can-outline"
      color="error"
      @confirm="deleteCompany"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import CompanySmsSettings from '@/components/CompanySmsSettings.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { Company } from '@/types/company'

const authStore = useAuthStore()
const companyStore = useCompanyStore()

const headers = [
  { title: 'Company', key: 'name' },
  { title: 'Default SMS provider', key: 'default_sms_provider' },
  { title: 'Created', key: 'created_at' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

const smsCompany = ref<Company | null>(null)
const showDialog = ref(false)
const showDelete = ref(false)
const saving = ref(false)
const editTarget = ref<Company | null>(null)
const deleteTarget = ref<Company | null>(null)

const form = reactive({
  name: '',
})

function resetForm() {
  form.name = ''
}

function openCreate() {
  editTarget.value = null
  resetForm()
  showDialog.value = true
}

function openEdit(company: Company) {
  editTarget.value = company
  form.name = company.name
  showDialog.value = true
}

async function save() {
  if (saving.value || !form.name.trim()) return
  saving.value = true
  try {
    const payload = { name: form.name.trim() }
    const company = editTarget.value
      ? await companyStore.update(editTarget.value.id, payload)
      : await companyStore.create(payload)
    if (!company) return
    await authStore.refreshCompanies()
    showDialog.value = false
    if (!editTarget.value) smsCompany.value = company
  } finally { saving.value = false }
}

function confirmDelete(company: Company) {
  deleteTarget.value = company
  showDelete.value = true
}

async function deleteCompany() {
  if (!deleteTarget.value) return
  await companyStore.remove(deleteTarget.value.id)
  await authStore.refreshCompanies()
}

function providerName(provider: string | null | undefined) {
  if (!provider) return 'Not set'
  const names: Record<string, string> = {
    quantum_sms_provider: 'Quantum',
    quantum: 'Quantum',
    hubtel: 'Hubtel',
    npontu: 'Npontu',
  }
  return names[provider] || provider.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(() => companyStore.fetchAll())
</script>

<style scoped>
.admin-heading { font-size: 22px; font-weight: 800; color: rgb(var(--v-theme-on-surface)); }
.admin-sub { font-size: 13px; color: rgba(var(--v-theme-on-surface), 0.5); margin-top: 2px; }
.admin-table :deep(th) { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: rgba(var(--v-theme-on-surface), 0.5); }
</style>
