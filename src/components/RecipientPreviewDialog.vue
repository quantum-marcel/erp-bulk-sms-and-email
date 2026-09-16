<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :max-width="760"
    :fullscreen="$vuetify.display.smAndDown"
  >
    <v-card
      :rounded="$vuetify.display.smAndDown ? '0' : 'xl'"
      elevation="8"
      class="d-flex flex-column"
      :style="$vuetify.display.smAndDown ? '' : 'max-height:85vh'"
    >
      <v-card-title class="pa-6 pb-2 d-flex align-start justify-space-between ga-2">
        <div style="min-width:0">
          <p class="font-weight-bold text-truncate">{{ domain?.name }}</p>
          <p v-if="domain?.description" class="text-caption text-medium-emphasis text-truncate mt-1">
            {{ domain.description }}
          </p>
        </div>
        <v-btn icon variant="text" size="small" style="flex-shrink:0" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <div v-if="domain?.rules?.length" class="px-6 pb-2 d-flex flex-wrap ga-1">
        <v-chip
          v-for="(rule, i) in domain.rules"
          :key="i"
          size="x-small"
          label
          variant="tonal"
          color="secondary-darken-2"
        >
          {{ partnersStore.fieldLabel(rule.field) }} {{ OP_LABELS[rule.op] || rule.op }} {{ rule.value }}
        </v-chip>
        <v-chip size="x-small" label variant="tonal" :color="domain.rule_logic === 'AND' ? 'primary' : 'info'">
          {{ domain.rule_logic }}
        </v-chip>
      </div>

      <v-card-text class="px-6 pt-2 pb-2 flex-grow-1" style="overflow-y:auto">
        <div v-if="domain && previewStore.isLoading(domain.id)" class="d-flex justify-center py-10">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <template v-else-if="result">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
            <p class="text-body-2">
              <strong class="text-primary">{{ result.total_matched.toLocaleString() }}</strong>
              recipient{{ result.total_matched === 1 ? '' : 's' }} match this list
            </p>
            <v-text-field
              v-if="result.sample.length"
              v-model="search"
              placeholder="Search..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              rounded="xl"
              hide-details
              clearable
              style="max-width:220px"
            />
          </div>

          <v-alert v-if="result.sample.length === 0" type="info" variant="tonal" density="compact" rounded="lg" class="text-caption">
            No recipient details available to display.
          </v-alert>

          <div v-else class="recipient-table-wrap">
            <v-data-table
              :headers="headers"
              :items="filteredSample"
              item-value="__key"
              density="comfortable"
              class="recipient-table"
            >
              <template v-for="col in headers" #[`item.${col.key}`]="{ item }" :key="col.key">
                {{ formatCell(item[col.key]) }}
              </template>
            </v-data-table>
          </div>

          <p v-if="result.sample.length < result.total_matched" class="text-caption text-medium-emphasis text-center mt-3">
            Showing {{ result.sample.length.toLocaleString() }} of {{ result.total_matched.toLocaleString() }} recipients.
          </p>
        </template>

        <v-alert v-else type="warning" variant="tonal" density="compact" rounded="lg" class="text-caption">
          Could not load recipients for this list.
        </v-alert>
      </v-card-text>

      <v-card-actions class="px-6 pb-6 pt-2">
        <v-spacer />
        <v-btn variant="tonal" rounded="lg" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { usePreviewStore } from '@/stores/preview'
import { usePartnersStore } from '@/stores/partners'
import type { Domain } from '@/types/sms'

const props = defineProps<{ modelValue: boolean; domain: Domain | null }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean] }>()

const previewStore = usePreviewStore()
const partnersStore = usePartnersStore()
const search = ref('')

// Keep interactive previews small while the backend query is being optimized.
const PREVIEW_LIMIT = 5

const OP_LABELS: Record<string, string> = {
  eq: 'is', neq: 'is not', gt: '>', gte: '>=', lt: '<', lte: '<=',
  like: 'contains', ilike: 'contains', in: 'in', not_in: 'not in',
  is_null: 'is empty', is_not_null: 'is not empty',
}

const result = computed(() => (props.domain ? previewStore.results[props.domain.id] : null))

function close() {
  emit('update:modelValue', false)
}

watch(
  () => [props.modelValue, props.domain?.id] as const,
  ([open]) => {
    if (open && props.domain) {
      search.value = ''
      partnersStore.fetchFields()
      previewStore.preview(props.domain.id, PREVIEW_LIMIT, false)
    }
  }
)

// Field names come from whatever the backend selects for the source table, so
// columns are derived from the sample data rather than hardcoded. Identity /
// contact-style fields are pulled to the front when present.
const PRIORITY = ['name', 'display_name', 'phone', 'mobile', 'email']

const headers = computed(() => {
  if (!result.value?.sample.length) return []
  const keys = new Set<string>()
  result.value.sample.forEach(row => Object.keys(row).forEach(k => keys.add(k)))
  const sorted = Array.from(keys).sort((a, b) => {
    const pa = PRIORITY.indexOf(a)
    const pb = PRIORITY.indexOf(b)
    if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
    return a.localeCompare(b)
  })
  return sorted.map(k => ({
    key: k,
    title: partnersStore.fieldLabel(k, k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
  }))
})

const filteredSample = computed(() => {
  const rows: Record<string, unknown>[] = result.value?.sample || []
  const withKeys: (Record<string, unknown> & { __key: number })[] = rows.map((row, i) => ({ ...row, __key: i }))
  if (!search.value) return withKeys
  const q = search.value.toLowerCase()
  return withKeys.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q)))
})

function formatCell(v: unknown): string {
  if (v === null || v === undefined || v === false) return '—'
  if (v === true) return 'Yes'
  return String(v)
}
</script>

<style scoped>
.recipient-table :deep(th) {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>
