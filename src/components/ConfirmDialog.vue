<template>
  <v-dialog v-model="model" :max-width="420" :fullscreen="$vuetify.display.xs">
    <v-card :rounded="$vuetify.display.xs ? '0' : 'xl'" elevation="8">
      <v-card-text class="pa-6">
        <div class="d-flex align-center mb-4">
          <div
            class="icon-wrap mr-4"
            :style="{ background: `rgba(var(--v-theme-${color}), 0.08)`, borderRadius: '12px', padding: '10px' }"
          >
            <v-icon :color="color" size="26">{{ icon }}</v-icon>
          </div>
          <div>
            <p class="font-weight-bold text-body-1">{{ title }}</p>
            <p class="text-caption text-medium-emphasis">{{ message }}</p>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="px-6 pb-6 pt-0 ga-2">
        <v-spacer />
        <v-btn variant="tonal" rounded="lg" @click="model = false">Cancel</v-btn>
        <v-btn :color="color" variant="flat" rounded="lg" @click="confirm">
          {{ confirmLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
const model = defineModel<boolean>()

const props = withDefaults(
  defineProps<{
    title?: string
    message?: string
    confirmLabel?: string
    icon?: string
    color?: string
  }>(),
  {
    title: 'Are you sure?',
    message: 'This action cannot be undone.',
    confirmLabel: 'Confirm',
    icon: 'mdi-alert-circle-outline',
    color: 'error',
  }
)

const emit = defineEmits<{ confirm: [] }>()

function confirm() {
  emit('confirm')
  model.value = false
}
</script>
