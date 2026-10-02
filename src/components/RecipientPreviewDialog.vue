<template>
  <v-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" max-width="900" :fullscreen="$vuetify.display.smAndDown">
    <v-card rounded="xl" class="d-flex flex-column" style="max-height:90vh">
      <v-card-title class="pa-6 pb-2 d-flex align-start justify-space-between ga-2">
        <div style="min-width:0">
          <p class="font-weight-bold text-truncate">{{ domain?.name || result?.domain_name || 'Recipients' }}</p>
          <p v-if="domain?.description" class="text-caption text-medium-emphasis mt-1">{{ domain.description }}</p>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close preview" @click="close" />
      </v-card-title>
      <v-card-text class="px-6 pt-2" style="overflow-y:auto">
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
          <p class="text-body-2"><strong>{{ result?.total_matched.toLocaleString() || 0 }}</strong> matching recipients</p>
          <SearchField v-model="search" placeholder="Search name, email or phone..." />
        </div>
        <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{ error }} <v-btn variant="text" @click="load">Retry</v-btn></v-alert>
        <v-data-table-server
          v-model:page="page"
          v-model:items-per-page="pageSize"
          :headers="headers"
          :items="rows"
          :items-length="result?.total_matched || 0"
          :items-per-page-options="[10, 20, 50, 100, 200]"
          :loading="loading"
          item-value="__key"
          no-data-text="No matching recipients."
          class="recipient-table"
        >
          <template v-for="col in headers" #[`item.${col.key}`]="{ item }" :key="col.key">{{ formatCell(item[col.key]) }}</template>
        </v-data-table-server>
        <p class="text-caption text-medium-emphasis mt-2">Search matches names, emails and phone numbers. For audiences using live Odoo fields, search is limited to locally synced contact data.</p>
      </v-card-text>
      <v-card-actions class="px-6 pb-6"><v-spacer /><v-btn variant="tonal" @click="close">Close</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script lang="ts" setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { usePreviewStore } from '@/stores/preview'
import { usePartnersStore } from '@/stores/partners'
import { useAuthStore } from '@/stores/auth'
import type { Domain, PreviewResponse } from '@/types/sms'
const props = defineProps<{ modelValue: boolean; domain: Domain | null; campaignId?: number }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const previewStore = usePreviewStore()
const partnersStore = usePartnersStore()
const authStore = useAuthStore()
const search = ref('')
const page = ref(1)
const pageSize = ref(20)
const result = ref<PreviewResponse | null>(null)
const loading = ref(false)
const error = ref('')
let request = 0
let timer: ReturnType<typeof setTimeout> | undefined
function close() { emit('update:modelValue', false) }
function cancel() { clearTimeout(timer); request++; loading.value = false }
async function load() {
  clearTimeout(timer)
  const current = ++request
  if (!props.modelValue || !authStore.activeCompany || (!props.domain && props.campaignId == null)) return
  loading.value = true; error.value = ''
  try {
    const response = await previewStore.previewPage(props.domain?.id ?? null, pageSize.value, (page.value - 1) * pageSize.value, search.value || '', props.campaignId)
    if (current === request) result.value = response
  } catch (e) {
    if (current === request) { result.value = null; error.value = e instanceof Error ? e.message : 'Could not load recipients.' }
  } finally { if (current === request) loading.value = false }
}
watch(() => [props.modelValue, props.domain?.id, props.campaignId, authStore.activeCompany?.id], () => {
  cancel(); result.value = null; search.value = ''; page.value = 1; error.value = ''
  if (props.modelValue && authStore.activeCompany) {
    partnersStore.fetchFields(authStore.activeCompany.id)
    void load()
  }
}, { immediate: true })
watch([search, pageSize], () => { page.value = 1 })
watch([search, page, pageSize], () => {
  cancel()
  if (!props.modelValue) return
  loading.value = true
  timer = setTimeout(load, 300)
})
onBeforeUnmount(cancel)
const priority = ['name', 'display_name', 'phone', 'mobile', 'email']
const headers = computed(() => {
  const keys = new Set<string>()
  result.value?.sample.forEach(row => Object.keys(row).forEach(key => keys.add(key)))
  return [...keys].sort((a, b) => {
    const pa = priority.indexOf(a), pb = priority.indexOf(b)
    return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb) || a.localeCompare(b)
  }).map(key => ({ key, sortable: false, title: partnersStore.fieldLabel(key, key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) }))
})
const rows = computed<(Record<string, unknown> & { __key: number })[]>(() => (result.value?.sample || []).map((row, index) => ({ ...row, __key: index })))
function formatCell(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}
</script>
<style scoped>
.recipient-table :deep(th) { font-size:11px; text-transform:uppercase; letter-spacing:0.6px; }
</style>
