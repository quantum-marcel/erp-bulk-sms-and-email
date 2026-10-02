<template>
  <div>
    <p class="text-caption font-weight-semibold mb-2 text-uppercase" style="letter-spacing:0.8px">
      Mailing List (Domain)
    </p>
    <DomainSelect v-model="selectedId" />

    <div v-if="selectedId" class="d-flex align-center ga-2 mt-2 text-caption">
      <template v-if="previewLoading">
        <v-progress-circular indeterminate size="12" width="2" color="primary" />
        <span class="text-medium-emphasis">Checking matched recipients…</span>
      </template>
      <template v-else-if="matchedCount !== undefined">
        <v-icon size="14" color="primary">mdi-account-multiple-outline</v-icon>
        <span class="text-medium-emphasis">
          <strong class="text-high-emphasis">{{ matchedCount.toLocaleString() }}</strong> recipient{{ matchedCount === 1 ? '' : 's' }} will be targeted
        </span>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import DomainSelect from '@/components/DomainSelect.vue'
import { countRules } from '@/utils/domainRules'
import { computed, watch } from 'vue'
import { usePreviewStore } from '@/stores/preview'

const props = defineProps<{ modelListId?: number }>()
const emit  = defineEmits<{ 'update:modelListId': [number | undefined] }>()

const previewStore = usePreviewStore()

const selectedId = computed({
  get: () => props.modelListId,
  set: (v) => emit('update:modelListId', v ?? undefined),
})

const matchedCount = computed(() =>
  selectedId.value !== undefined ? previewStore.results[selectedId.value]?.total_matched : undefined
)
const previewLoading = computed(() =>
  selectedId.value !== undefined && previewStore.isLoading(selectedId.value)
)

watch(selectedId, (id) => {
  if (id !== undefined && previewStore.results[id] === undefined) {
    previewStore.preview(id)
  }
}, { immediate: true })


</script>
