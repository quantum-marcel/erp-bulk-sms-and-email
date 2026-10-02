<template>
  <v-dialog :model-value="true" max-width="760" @update:model-value="value => { if (!value) emit('close') }">
    <v-card rounded="xl">
      <v-card-title class="pa-6 pb-2">Contacts · {{ domain.name }}</v-card-title>
      <v-card-text>
        <v-alert v-if="error" type="error" class="mb-3">{{ error }} <v-btn variant="text" @click="load">Retry</v-btn></v-alert>
        <SearchField v-model="search" placeholder="Search email or phone..." class="mb-3" />
        <v-data-table-server v-model:page="page" v-model:items-per-page="pageSize" :items-length="total" :items-per-page-options="[10, 20, 50, 100, 200]" disable-sort :headers="[{ title: 'Contact', key: 'value' }, { title: 'Type', key: 'channel' }]" :items="contacts"  :loading="loading" />
      </v-card-text>
      <v-card-actions><v-spacer /><v-btn @click="emit('close')">Close</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
import { useServerPage } from '@/composables/useServerPage'
import type { ContactOut, DomainOut } from '@/types/backend'
const props = defineProps<{ domain: DomainOut }>()
const emit = defineEmits<{ close: [] }>()
const { items: contacts, total, page, pageSize, search, loading, error, load } = useServerPage<ContactOut>(() => `/domains/${props.domain.id}/contacts`)
</script>
