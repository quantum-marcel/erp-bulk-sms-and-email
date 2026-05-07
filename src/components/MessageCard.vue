<!-- Thin wrapper kept for backward compat — delegates everything to CampaignCard -->
<template>
  <CampaignCard
    v-if="campaign"
    :campaign="campaign"
    v-bind="$attrs"
    @view="emit('view')"
    @edit="emit('edit')"
    @send="emit('send')"
    @retry="emit('retry')"
    @delete="emit('delete')"
    @logs="emit('logs')"
  />
  <!-- Skeleton shown while campaign data is loading -->
  <v-card v-else rounded="xl" elevation="0" class="pa-4" style="border: 1.5px solid rgba(0,0,0,0.08)">
    <div class="d-flex align-center ga-3">
      <v-skeleton-loader type="avatar" width="36" height="36" />
      <div style="flex:1">
        <v-skeleton-loader type="text" width="40%" class="mb-1" />
        <v-skeleton-loader type="text" width="60%" />
      </div>
    </div>
  </v-card>
</template>

<script lang="ts" setup>
import CampaignCard from '@/components/CampaignCard.vue'
import type { Campaign } from '@/types/sms'

defineProps<{ campaign?: Campaign }>()
const emit = defineEmits<{ view: []; edit: []; send: []; retry: []; delete: []; logs: [] }>()
</script>
