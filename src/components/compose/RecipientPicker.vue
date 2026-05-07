<template>
  <div>
    <p class="text-caption font-weight-semibold mb-2 text-uppercase" style="letter-spacing:0.8px">
      Mailing List (Domain)
    </p>
    <v-select
      v-model="selectedId"
      :items="domainStore.domains"
      item-title="name"
      item-value="id"
      placeholder="Select a mailing list..."
      variant="outlined"
      density="comfortable"
      rounded="lg"
      clearable
      hide-details
      :loading="domainStore.isLoading"
    >
      <template #item="{ props: p, item }">
        <v-list-item v-bind="p">
          <template #subtitle>
            <span class="text-caption text-medium-emphasis">
              {{ item.raw.source_table }} · {{ item.raw.rules?.length || 0 }} rules
            </span>
          </template>
        </v-list-item>
      </template>
    </v-select>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useDomainStore } from '@/stores/domain'

const props = defineProps<{ modelListId?: number }>()
const emit  = defineEmits<{ 'update:modelListId': [number | undefined] }>()

const domainStore = useDomainStore()

const selectedId = computed({
  get: () => props.modelListId,
  set: (v) => emit('update:modelListId', v ?? undefined),
})

onMounted(() => domainStore.fetchAll())
</script>
