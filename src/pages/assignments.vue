<template>
  <div>
    <div class="d-flex align-start align-sm-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="admin-heading">Assignments</h2>
        <p class="admin-sub">Connect users to the companies they can access.</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-account-plus-outline" rounded="lg" elevation="0" @click="openAssign">
        New Assignment
      </v-btn>
    </div>

    <v-card class="ng-card" rounded="lg">
      <v-data-table
        :headers="headers"
        :items="userStore.assignments"
        :loading="userStore.assignmentsLoading"
        item-value="id"
        class="admin-table"
      >
        <template #item.username="{ item }">
          <div class="py-2">
            <p class="font-weight-semibold">@{{ item.username }}</p>
            <p class="text-caption text-medium-emphasis">User #{{ item.user_id }}</p>
          </div>
        </template>

        <template #item.company_id="{ item }">
          <div class="py-2">
            <p class="font-weight-semibold">{{ companyName(item.company_id) }}</p>
            <p class="text-caption text-medium-emphasis">Company #{{ item.company_id }}</p>
          </div>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-end">
            <v-btn icon size="small" variant="text" color="error" @click="confirmRemove(item)">
              <v-icon size="17">mdi-link-variant-off</v-icon>
              <v-tooltip activator="parent" location="top">Remove</v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="showDialog" :max-width="520" :fullscreen="$vuetify.display.smAndDown" persistent>
      <v-card :rounded="$vuetify.display.smAndDown ? '0' : 'lg'" elevation="8">
        <v-card-title class="pa-6 pb-2 font-weight-bold">New Assignment</v-card-title>
        <v-card-text class="pa-6 pt-2">
          <v-combobox
            v-model="form.username"
            :items="usernames"
            label="Username *"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            hide-details
            class="mb-3"
          />
          <v-select
            v-model="form.company_id"
            :items="companyStore.companies"
            item-title="name"
            item-value="id"
            label="Company *"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-6 pt-0 ga-2">
          <v-spacer />
          <v-btn variant="tonal" rounded="lg" @click="showDialog = false">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" elevation="0" :loading="saving" :disabled="!canSave" @click="save">
            Assign
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="showDelete"
      title="Remove Assignment"
      :message="`Remove @${deleteTarget?.username || 'this user'} from ${deleteTarget ? companyName(deleteTarget.company_id) : 'this company'}?`"
      confirm-label="Remove"
      icon="mdi-link-variant-off"
      color="error"
      @confirm="remove"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { useUserStore } from '@/stores/user'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { UserCompanyAssignment } from '@/types/user'

const companyStore = useCompanyStore()
const userStore = useUserStore()

const headers = [
  { title: 'User', key: 'username' },
  { title: 'Company', key: 'company_id' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

const showDialog = ref(false)
const showDelete = ref(false)
const saving = ref(false)
const deleteTarget = ref<UserCompanyAssignment | null>(null)

const form = reactive({
  username: '',
  company_id: null as number | null,
})

const usernames = computed(() => userStore.users.map(u => u.username))
const canSave = computed(() => !!form.username.trim() && !!form.company_id)

function companyName(id: number) {
  return companyStore.companies.find(c => c.id === id)?.name || 'Unknown company'
}

function openAssign() {
  form.username = ''
  form.company_id = companyStore.companies[0]?.id ?? null
  showDialog.value = true
}

async function save() {
  if (!canSave.value || !form.company_id) return
  saving.value = true
  await userStore.assign({
    username: form.username.trim(),
    company_id: form.company_id,
  })
  saving.value = false
  showDialog.value = false
}

function confirmRemove(assignment: UserCompanyAssignment) {
  deleteTarget.value = assignment
  showDelete.value = true
}

async function remove() {
  if (!deleteTarget.value) return
  await userStore.removeAssignment(deleteTarget.value.id)
}

onMounted(async () => {
  await Promise.all([
    companyStore.fetchAll(),
    userStore.fetchAll(),
    userStore.fetchAssignments(),
  ])
})
</script>

<style scoped>
.admin-heading { font-size: 22px; font-weight: 800; color: rgb(var(--v-theme-on-surface)); }
.admin-sub { font-size: 13px; color: rgba(var(--v-theme-on-surface), 0.5); margin-top: 2px; }
.admin-table :deep(th) { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: rgba(var(--v-theme-on-surface), 0.5); }
</style>
