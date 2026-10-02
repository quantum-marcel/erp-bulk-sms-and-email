<template>
  <v-text-field
    v-model="model"
    :placeholder="placeholder"
    :aria-label="placeholder"
    prepend-inner-icon="mdi-magnify"
    variant="outlined"
    density="comfortable"
    rounded="xl"
    maxlength="255"
    hide-details
    clearable
    style="width:100%;max-width:min(420px, 100%)"
  />
</template>

<script setup lang="ts">
defineProps<{ placeholder: string }>()
const model = defineModel<string | null>()
</script>
