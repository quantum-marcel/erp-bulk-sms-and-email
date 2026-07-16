<template>
  <v-card rounded="xl" elevation="0" class="campaign-card pa-4" @click="emit('view')">
    <div class="d-flex align-start justify-space-between ga-2">
      <div class="d-flex align-start ga-3 flex-grow-1" style="min-width:0">
        <!-- Channel icon -->
        <div class="chan-icon-wrap" :style="{ background: channelBg }">
          <v-icon :color="channelColor" size="18">{{ channelIcon }}</v-icon>
        </div>

        <div style="min-width:0; flex:1">
          <div class="d-flex align-center ga-2 mb-1 flex-wrap">
            <p class="font-weight-semibold text-body-2 text-truncate">{{ campaign.name }}</p>
            <v-chip size="x-small" :color="statusColor" label variant="tonal">
              <v-icon start size="10">{{ statusIcon }}</v-icon>
              {{ campaign.status }}
            </v-chip>
            <v-chip size="x-small" :color="channelColor" label variant="tonal">
              {{ campaign.channel }}
            </v-chip>
          </div>

          <!-- Stats row -->
          <div class="d-flex align-center ga-3 flex-wrap">
            <span class="text-caption text-medium-emphasis">
              <v-icon size="12" class="mr-1">mdi-account-multiple-outline</v-icon>
              {{ campaign.total_recipients.toLocaleString() }}
            </span>
            <span v-if="campaign.sent_count" class="text-caption" style="color:#2E7D32">
              <v-icon size="12" class="mr-1">mdi-check</v-icon>
              {{ campaign.sent_count.toLocaleString() }} sent
            </span>
            <span v-if="campaign.failed_count" class="text-caption text-error">
              <v-icon size="12" class="mr-1">mdi-alert-circle-outline</v-icon>
              {{ campaign.failed_count.toLocaleString() }} failed
            </span>
            <span class="text-caption text-medium-emphasis">
              {{ formatDate(campaign.created_at) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="d-flex ga-1 flex-shrink-0" @click.stop>
        <!-- View detail -->
        <v-btn icon size="small" variant="text" color="primary" @click="emit('view')">
          <v-icon size="17">mdi-eye-outline</v-icon>
          <v-tooltip activator="parent" location="top">View Campaign</v-tooltip>
        </v-btn>

        <!-- Edit (draft only) -->
        <v-btn v-if="campaign.status === 'draft'" icon size="small" variant="text" color="primary" @click="emit('edit')">
          <v-icon size="17">mdi-pencil-outline</v-icon>
          <v-tooltip activator="parent" location="top">Edit Draft</v-tooltip>
        </v-btn>

        <!-- Send (draft only) -->
        <v-btn v-if="campaign.status === 'draft'" icon size="small" variant="text" color="success" @click="emit('send')">
          <v-icon size="17">mdi-send-outline</v-icon>
          <v-tooltip activator="parent" location="top">Send Now</v-tooltip>
        </v-btn>

        <!-- Retry (failed only) -->
        <v-btn v-if="campaign.status === 'failed' || campaign.failed_count > 0" icon size="small" variant="text" color="warning" @click="emit('retry')">
          <v-icon size="17">mdi-refresh</v-icon>
          <v-tooltip activator="parent" location="top">Retry Failed</v-tooltip>
        </v-btn>

        <!-- Delete (draft only) -->
        <v-btn v-if="campaign.status === 'draft'" icon size="small" variant="text" color="error" @click="emit('delete')">
          <v-icon size="17">mdi-trash-can-outline</v-icon>
          <v-tooltip activator="parent" location="top">Delete Draft</v-tooltip>
        </v-btn>
      </div>
    </div>
  </v-card>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { Campaign } from '@/types/sms'

const props = defineProps<{ campaign: Campaign }>()
const emit  = defineEmits<{
  view: []; edit: []; send: []; retry: []; delete: []; logs: []
}>()

const statusColor = computed(() => {
  switch (props.campaign.status) {
    case 'completed':               return 'success'
    case 'completed_with_failures': return 'warning'
    case 'draft':                   return 'warning'
    case 'failed':                  return 'error'
    case 'running':                 return 'secondary-darken-2'
    default:                        return 'secondary'
  }
})
const statusIcon = computed(() => {
  switch (props.campaign.status) {
    case 'completed':               return 'mdi-send-check'
    case 'completed_with_failures': return 'mdi-alert'
    case 'draft':                   return 'mdi-pencil'
    case 'failed':                  return 'mdi-alert-circle'
    case 'running':                 return 'mdi-loading'
    default:                        return 'mdi-circle'
  }
})

const channelIcon  = computed(() => {
  if (props.campaign.channel === 'email') return 'mdi-email-outline'
  if (props.campaign.channel === 'sms')   return 'mdi-message-text-outline'
  return 'mdi-layers-outline'
})
const channelColor = computed(() => {
  if (props.campaign.channel === 'email') return 'info'
  if (props.campaign.channel === 'sms')   return 'success'
  return 'secondary'
})
const channelBg = computed(() => {
  if (props.campaign.channel === 'email') return 'rgba(21,101,192,0.1)'
  if (props.campaign.channel === 'sms')   return 'rgba(46,125,50,0.1)'
  return 'rgba(var(--v-theme-secondary),0.1)'
})

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}
</script>

<style scoped>
.campaign-card {
  border: 1.5px solid rgb(var(--v-theme-card-border));
  cursor: pointer;
  transition: all 0.18s;
}
.campaign-card:hover {
  border-color: rgba(211,33,41,0.3);
  background: rgba(211,33,41,0.02);
  transform: translateY(-1px);
}
.chan-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
