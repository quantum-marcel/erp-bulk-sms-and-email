<template>
  <div>
    <div class="d-flex align-start align-sm-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="admin-heading">Users</h2>
        <p class="admin-sub">Create users, grant access, and maintain account status.</p>
      </div>
      <div class="d-flex ga-2"><v-btn color="primary" prepend-icon="mdi-plus" rounded="lg" @click="openCreate">New User</v-btn>
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-refresh" rounded="lg" @click="load()">
        Refresh
      </v-btn></div>
    </div>

    <SearchField v-model="search" placeholder="Search users..." class="mb-5" />
    <v-alert v-if="error" type="error" class="mb-4">{{ error }} <v-btn variant="text" @click="load">Retry</v-btn></v-alert>
    <v-card class="ng-card" rounded="lg">
      <v-data-table-server
        v-model:page="page"
        v-model:items-per-page="pageSize"
        :items-length="total"
        :items-per-page-options="[10, 20, 50, 100, 200]"
        disable-sort
        :headers="headers"
        :items="items"
        :loading="loading"
        item-value="id"
        class="admin-table"
      >
        <template #item.name="{ item }">
          <div class="py-2">
            <p class="font-weight-semibold">{{ item.name || item.username }}</p>
            <p class="text-caption text-medium-emphasis">@{{ item.username }}</p>
          </div>
        </template>

        <template #item.email="{ item }">
          <span class="text-body-2">{{ item.email || '-' }}</span>
        </template>

        <template #item.is_active="{ item }">
          <v-chip :color="item.is_active ? 'success' : 'error'" size="small" label variant="tonal">
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <template #item.is_admin="{ item }">
          <v-chip :color="item.is_admin ? 'primary' : 'default'" size="small" label variant="tonal">
            {{ item.is_admin ? 'Admin' : 'User' }}
          </v-chip>
        </template>

        <template #item.last_login="{ item }">
          <span class="text-body-2">{{ item.last_login ? formatDate(item.last_login) : '-' }}</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-end">
            <v-btn icon size="small" variant="text" @click="openEdit(item)">
              <v-icon size="17">mdi-pencil-outline</v-icon>
              <v-tooltip activator="parent" location="top">Edit</v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <v-dialog v-model="showDialog" :max-width="520" :fullscreen="$vuetify.display.smAndDown" :persistent="saving">
      <v-card :rounded="$vuetify.display.smAndDown ? '0' : 'lg'" elevation="8">
        <v-card-title class="pa-6 pb-2 font-weight-bold">{{ editTarget ? 'Edit User' : 'New User' }}</v-card-title>
        <v-card-text class="pa-6 pt-2">
          <v-alert v-if="accessError" type="error" class="mb-4">{{ accessError }} <v-btn variant="text" @click="loadAccess">Retry</v-btn></v-alert>
          <v-alert v-if="!editTarget" type="info" variant="tonal" class="mb-4">Use the LDAP username. The user signs in with their existing LDAP password. Select their company access below.</v-alert>
          <v-text-field v-if="!editTarget" v-model="form.username" label="LDAP username *" variant="outlined" class="mb-3" />
          <v-text-field v-model="form.name" label="Name" variant="outlined" density="comfortable" rounded="lg" hide-details class="mb-3" />
          <v-text-field v-model="form.email" label="Email" variant="outlined" density="comfortable" rounded="lg" hide-details class="mb-4" />
          <v-autocomplete
            v-model="form.company_ids"
            v-model:search="companySearch"
            :items="companyChoices"
            :loading="companiesLoading || accessLoading"
            :disabled="saving || accessLoading || !!accessError"
            item-title="name" item-value="id" multiple chips closable-chips no-filter
            label="Company access" variant="outlined" class="mb-3"
            hint="Select the companies this user can access. Clear all to remove company access." persistent-hint
          >
            <template #append-item><v-pagination v-model="companyPage" :length="companyPages" :total-visible="4" :disabled="companiesLoading" @click.stop /></template>
          </v-autocomplete>
          <v-alert v-if="companiesError" type="error" class="mb-3">{{ companiesError }} <v-btn variant="text" @click="loadCompanies">Retry</v-btn></v-alert>
          <v-switch v-model="form.is_active" color="primary" inset hide-details label="Active account" />
          <v-switch v-model="form.is_admin" color="primary" inset hide-details label="Administrator" />
        </v-card-text>
        <v-card-actions class="px-6 pb-6 pt-0 ga-2">
          <v-spacer />
          <v-btn variant="tonal" rounded="lg" :disabled="saving" @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" elevation="0" :loading="saving" :disabled="saving || accessLoading || !!accessError || (!editTarget && !form.username.trim())" @click="save">
            {{ editTarget ? 'Update' : 'Create User' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useServerPage } from '@/composables/useServerPage'
import { computed, reactive, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { get } from '@/utils/http'
import type { Company } from '@/types/company'
import type { AppUser } from '@/types/user'

const { items, total, page, pageSize, search, loading, error, load } = useServerPage<AppUser>(() => '/users/')
const userStore = useUserStore()

const headers = [
  { title: 'User', key: 'name' },
  { title: 'Email', key: 'email' },
  { title: 'Status', key: 'is_active' },
  { title: 'Role', key: 'is_admin' },
  { title: 'Last Login', key: 'last_login' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

const showDialog = ref(false)
const saving = ref(false)
const editTarget = ref<AppUser | null>(null)

const accessLoading = ref(false)
const accessError = ref('')
let accessRevision = 0
const companyNames = ref<Record<number, string>>({})
const { items: companyOptions, page: companyPage, totalPages: companyPages, search: companySearch, loading: companiesLoading, error: companiesError, load: loadCompanies } = useServerPage<Company>(() => showDialog.value ? '/companies/' : null)
watch(companyOptions, rows => { for (const company of rows) companyNames.value[company.id] = company.name })
const companyChoices = computed(() => [
  ...form.company_ids.filter(id => !companyOptions.value.some(company => company.id === id)).map(id => ({ id, name: companyNames.value[id] || `Company #${id}` })),
  ...companyOptions.value,
])
watch(showDialog, open => { if (!open) accessRevision++ })
function closeDialog() { accessRevision++; showDialog.value = false }
function openCreate() {
  accessRevision++; accessLoading.value = false; accessError.value = ''; companySearch.value = ''
  editTarget.value = null
  Object.assign(form, { username: '', name: '', email: '', is_active: true, is_admin: false, company_ids: [] })
  showDialog.value = true
}

const form = reactive({
  company_ids: [] as number[],
  username: '',
  name: '',
  email: '',
  is_active: true,
  is_admin: false,
})

function openEdit(user: AppUser) {
  editTarget.value = user
  form.company_ids = []
  companySearch.value = ''
  form.name = user.name || ''
  form.email = user.email || ''
  form.is_active = user.is_active
  form.is_admin = user.is_admin
  showDialog.value = true
  void loadAccess()
}

async function loadAccess() {
  const user = editTarget.value
  if (!user) return
  const revision = ++accessRevision
  accessLoading.value = true; accessError.value = ''
  try {
    const ids = await userStore.fetchCompanyIds(user)
    if (revision !== accessRevision) return
    form.company_ids = ids
    // Names are optional; keep IDs selectable even if a company lookup fails.
    void Promise.all(ids.filter(id => !companyNames.value[id]).map(async id => {
      try {
        const company = await get<Company>(`/companies/${id}`)
        if (revision === accessRevision) companyNames.value[id] = company.name
      } catch { /* Fall back to Company #id. */ }
    }))
  } catch (e) {
    if (revision === accessRevision) accessError.value = e instanceof Error ? e.message : 'Could not load company access.'
  } finally { if (revision === accessRevision) accessLoading.value = false }
}

function clean(value: string) {
  return value.trim() || null
}

async function save() {
  if (saving.value || accessLoading.value || accessError.value || (!editTarget.value && !form.username.trim())) return
  saving.value = true
  try {
    const payload = { name: clean(form.name), email: clean(form.email), is_active: form.is_active, is_admin: form.is_admin, company_ids: [...form.company_ids] }
    const result = editTarget.value
      ? await userStore.update(editTarget.value.id, payload)
      : await userStore.create({ ...payload, username: form.username.trim() })
    if (result) { showDialog.value = false; await load() }
  } finally { saving.value = false }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


</script>

<style scoped>
.admin-heading { font-size: 22px; font-weight: 800; color: rgb(var(--v-theme-on-surface)); }
.admin-sub { font-size: 13px; color: rgba(var(--v-theme-on-surface), 0.5); margin-top: 2px; }
.admin-table :deep(th) { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: rgba(var(--v-theme-on-surface), 0.5); }
</style>
