<template>
  <div>
    <div class="d-flex align-start align-sm-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="admin-heading">Users</h2>
        <p class="admin-sub">Create users, grant access, and maintain account status.</p>
      </div>
      <div class="d-flex ga-2"><v-btn to="/assignments" variant="text">Company access</v-btn><v-btn color="primary" prepend-icon="mdi-plus" rounded="lg" @click="openCreate">New User</v-btn>
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-refresh" rounded="lg" @click="userStore.fetchAll(true)">
        Refresh
      </v-btn></div>
    </div>

    <v-card class="ng-card" rounded="lg">
      <v-data-table
        :headers="headers"
        :items="userStore.users"
        :loading="userStore.isLoading"
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
      </v-data-table>
    </v-card>

    <v-dialog v-model="showDialog" :max-width="520" :fullscreen="$vuetify.display.smAndDown" persistent>
      <v-card :rounded="$vuetify.display.smAndDown ? '0' : 'lg'" elevation="8">
        <v-card-title class="pa-6 pb-2 font-weight-bold">{{ editTarget ? 'Edit User' : 'New User' }}</v-card-title>
        <v-card-text class="pa-6 pt-2">
          <v-alert v-if="!editTarget" type="info" variant="tonal" class="mb-4">Use the LDAP username. The user signs in with their existing LDAP password. After creation, grant company access in Assignments.</v-alert>
          <v-text-field v-if="!editTarget" v-model="form.username" label="LDAP username *" variant="outlined" class="mb-3" />
          <v-text-field v-model="form.name" label="Name" variant="outlined" density="comfortable" rounded="lg" hide-details class="mb-3" />
          <v-text-field v-model="form.email" label="Email" variant="outlined" density="comfortable" rounded="lg" hide-details class="mb-4" />
          <v-switch v-model="form.is_active" color="primary" inset hide-details label="Active account" />
          <v-switch v-model="form.is_admin" color="primary" inset hide-details label="Administrator" />
        </v-card-text>
        <v-card-actions class="px-6 pb-6 pt-0 ga-2">
          <v-spacer />
          <v-btn variant="tonal" rounded="lg" @click="showDialog = false">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" elevation="0" :loading="saving" :disabled="saving || (!editTarget && !form.username.trim())" @click="save">
            {{ editTarget ? 'Update' : 'Create User' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import type { AppUser } from '@/types/user'

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

function openCreate() { editTarget.value = null; Object.assign(form, { username: '', name: '', email: '', is_active: true, is_admin: false }); showDialog.value = true }

const form = reactive({
  username: '',
  name: '',
  email: '',
  is_active: true,
  is_admin: false,
})

function openEdit(user: AppUser) {
  editTarget.value = user
  form.name = user.name || ''
  form.email = user.email || ''
  form.is_active = user.is_active
  form.is_admin = user.is_admin
  showDialog.value = true
}

function clean(value: string) {
  return value.trim() || null
}

async function save() {
  if (saving.value || (!editTarget.value && !form.username.trim())) return
  saving.value = true
  try {
    const payload = { name: clean(form.name), email: clean(form.email), is_active: form.is_active, is_admin: form.is_admin }
    const result = editTarget.value
      ? await userStore.update(editTarget.value.id, payload)
      : await userStore.create({ ...payload, username: form.username.trim() })
    if (result) showDialog.value = false
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

onMounted(() => userStore.fetchAll())
</script>

<style scoped>
.admin-heading { font-size: 22px; font-weight: 800; color: rgb(var(--v-theme-on-surface)); }
.admin-sub { font-size: 13px; color: rgba(var(--v-theme-on-surface), 0.5); margin-top: 2px; }
.admin-table :deep(th) { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: rgba(var(--v-theme-on-surface), 0.5); }
</style>
