<template>
  <div>
    <v-autocomplete
      :model-value="modelValue"
      @update:model-value="value => emit('update:modelValue', value ?? undefined)"
      v-model:search="search"
      :items="options"
      :loading="loading"
      item-title="name"
      item-value="id"
      label="Mailing list"
      placeholder="Search mailing lists..."
      no-filter clearable variant="outlined" rounded="lg" hide-details="auto"
    >
      <template #append-item>
        <v-pagination v-if="totalPages > 1" v-model="page" :length="totalPages" :total-visible="4" :disabled="loading" @click.stop />
      </template>
    </v-autocomplete>
    <p v-if="error || selectionError" class="text-error text-caption mt-1">{{ error || selectionError }} <v-btn size="small" variant="text" @click="retry">Retry</v-btn></p>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useServerPage } from '@/composables/useServerPage'
import { get } from '@/utils/http'
import type { Domain } from '@/types/sms'
const props = defineProps<{ modelValue?: number }>()
const emit = defineEmits<{ 'update:modelValue': [number | undefined]; selected: [Domain | null] }>()
const { items, page, totalPages, search, loading, error, load } = useServerPage<Domain>(() => '/domains/')
const selected = ref<Domain | null>(null)
const selectionError = ref('')
let revision = 0
const options = computed(() => selected.value && !items.value.some(item => item.id === selected.value?.id) ? [selected.value, ...items.value] : items.value)
async function resolveSelection() {
  const request = ++revision
  selected.value = null; selectionError.value = ''; emit('selected', null)
  if (props.modelValue == null) return
  try {
    const result = items.value.find(item => item.id === props.modelValue) || await get<Domain>(`/domains/${props.modelValue}`)
    if (request === revision) { selected.value = result; emit('selected', result) }
  } catch (e) { if (request === revision) selectionError.value = e instanceof Error ? e.message : 'Could not load mailing list.' }
}
function retry() { void load(); void resolveSelection() }
watch(() => props.modelValue, resolveSelection, { immediate: true })
onBeforeUnmount(() => { revision++ })
</script>
