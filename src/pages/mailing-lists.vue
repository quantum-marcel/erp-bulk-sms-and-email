<template>
  <div>
    <div class="d-flex align-start align-sm-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="font-weight-bold" style="font-size:clamp(17px,4vw,22px)">Mailing Lists</h2>
        <p class="text-medium-emphasis text-body-2">
          Build audiences using Odoo rules or saved email addresses and phone numbers.
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" rounded="xl" elevation="0" :disabled="!authStore.hasCompany" @click="openCreate">
        New List
      </v-btn>
    </div>

    <v-card v-if="!authStore.hasCompany" rounded="xl" class="pa-6 ng-card">
      <p class="text-body-2">{{ authStore.isAdmin ? 'Select a company above to manage its mailing lists.' : 'Contact an administrator to assign your account to a company.' }}</p>
    </v-card>
    <template v-else>
    <p class="text-body-2 text-medium-emphasis mb-4">Mailing lists for {{ authStore.activeCompany?.name }}</p>
    <SearchField v-model="search" placeholder="Search mailing lists..." class="mb-5" />
    <v-alert v-if="error" type="error" class="mb-4">{{ error }} <v-btn @click="load">Retry</v-btn></v-alert>
    <div v-if="loading" class="d-flex justify-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="items.length === 0" class="text-center py-16">
      <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-account-group-outline</v-icon>
      <p class="font-weight-semibold text-h6 mb-1">No mailing lists yet</p>
      <p class="text-medium-emphasis text-body-2 mb-4">Create your first list to start targeting recipients.</p>
      <v-btn color="primary" rounded="xl" prepend-icon="mdi-plus" elevation="0" @click="openCreate">
        Create Mailing List
      </v-btn>
    </div>
    

    <v-row v-else dense>
      <v-col v-for="d in items" :key="d.id" cols="12" sm="6" md="4" class="d-flex">
        <v-card rounded="xl" elevation="0" class="pa-4 domain-card d-flex flex-column flex-grow-1">
          <div class="d-flex align-center mb-3">
            <div class="domain-icon mr-3">
              <v-icon color="primary" size="18">mdi-account-group-outline</v-icon>
            </div>
            <div class="grow" style="min-width:0">
              <p class="font-weight-semibold text-body-2 text-truncate">{{ d.name }}</p>
              <p class="text-caption text-medium-emphasis">{{ d.kind === 'list' ? 'Saved contacts' : countRules(d.rules) + ' conditions' }}</p>
            </div>
            <div class="d-flex ga-1">
              <v-btn icon size="x-small" variant="text" @click="openPreview(d)">
                <v-icon size="15">mdi-account-search-outline</v-icon>
                <v-tooltip activator="parent" location="top">Preview Recipients</v-tooltip>
              </v-btn>
              <v-btn icon size="x-small" variant="text" @click="openEdit(d)">
                <v-icon size="15">mdi-pencil-outline</v-icon>
              </v-btn>
              <v-btn icon size="x-small" variant="text" color="error" @click="confirmDel(d.id)">
                <v-icon size="15">mdi-trash-can-outline</v-icon>
              </v-btn>
            </div>
          </div>

          <p v-if="d.description" class="text-caption text-medium-emphasis mb-3">{{ d.description }}</p>

          <p v-if="d.kind === 'list'" class="text-caption mb-3">{{ d.email_count || 0 }} emails · {{ d.phone_count || 0 }} phone numbers</p>
          <div v-if="d.rules.length" class="mb-3">
            <v-chip
              v-for="(rule, i) in d.rules.slice(0,3)"
              :key="i"
              size="x-small"
              label
              variant="tonal"
              color="secondary-darken-2"
              class="mr-1 mb-1"
            >
              {{ ruleSummary(rule, name => partnersStore.fieldLabel(name)) }}
            </v-chip>
            <v-chip v-if="d.rules.length > 3" size="x-small" label variant="tonal" color="secondary" class="mb-1">
              +{{ d.rules.length - 3 }} more
            </v-chip>
          </div>

          <div class="d-flex align-center justify-space-between mt-auto">
            <v-chip size="x-small" :color="d.rule_logic === 'AND' ? 'primary' : 'info'" label variant="tonal">
              {{ d.kind === 'list' ? 'Contact list' : d.rule_logic }}
            </v-chip>
            <v-btn
              :to="`/compose?domain=${d.id}`"
              size="x-small"
              color="primary"
              variant="tonal"
              rounded="lg"
              prepend-icon="mdi-send-outline"
            >
              Use in Campaign
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-pagination v-if="totalPages > 1" v-model="page" :length="totalPages" :total-visible="7" class="mt-4" />

    <!-- Create / Edit dialog -->
    <v-dialog v-model="showDialog" :max-width="960" :fullscreen="$vuetify.display.smAndDown" :persistent="saving || importingCsv">
      <v-card :rounded="$vuetify.display.smAndDown ? '0' : 'xl'" elevation="8" class="d-flex flex-column" style="height:100%">
        <v-card-title class="pa-6 pb-2 font-weight-bold">
          {{ editTarget ? 'Edit Mailing List' : 'New Mailing List' }}
        </v-card-title>

        <v-card-text class="pa-6 pt-2 flex-grow-1" style="overflow-y:auto">
          <v-text-field
            v-model="dlg.name"
            label="List Name *"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            hide-details
            class="mb-3"
          />

          <v-text-field
            v-model="dlg.description"
            label="Description"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            hide-details
            class="mb-3"
          />

          <v-select v-model="dlg.kind" :items="[{ title: 'Odoo filter rules', value: 'rules' }, { title: 'Saved contacts', value: 'list' }]" label="List type" :disabled="!!editTarget || importingCsv" />
          <div v-if="dlg.kind === 'list'">
            <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-file-upload-outline" :disabled="importingCsv || saving" @click="emailCsvInput?.click()">Upload email CSV</v-btn>
            <input ref="emailCsvInput" type="file" accept=".csv,text/csv" hidden @change="onCsvSelected($event, 'email')">
            <v-textarea v-model="dlg.emails" label="Email addresses" hint="Separate with commas, semicolons or new lines." persistent-hint />
            <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-file-upload-outline" :disabled="importingCsv || saving" @click="phoneCsvInput?.click()">Upload phone CSV</v-btn>
            <input ref="phoneCsvInput" type="file" accept=".csv,text/csv" hidden @change="onCsvSelected($event, 'phone')">
            <v-textarea v-model="dlg.phones" label="Phone numbers" hint="Include country codes. Separate with commas, semicolons or new lines." persistent-hint />
            <p class="text-caption">{{ splitContacts(dlg.emails).length }} emails · {{ splitContacts(dlg.phones).length }} phone numbers</p>
          </div>
          <template v-else>
            <p class="text-body-2 mb-3">Use groups to combine conditions, for example (Name is Marcel OR Name is Zeus) AND Balance is greater than 0.</p>
            <v-progress-linear v-if="partnersStore.loadingFields" indeterminate class="mb-3" />
            <RuleGroupEditor v-model="dlg.rules" v-model:logic="dlg.rule_logic" :fields="partnersStore.fields" :disabled="saving || partnersStore.loadingFields" />
          </template>
        </v-card-text>

        <v-card-actions class="px-6 pb-6 pt-0 ga-2">
          <v-spacer />
          <v-btn variant="tonal" rounded="lg" :disabled="importingCsv || saving" @click="showDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            :loading="saving"
            :disabled="!dlg.name.trim() || importingCsv || saving"
            @click="handleSave"
          >
            {{ editTarget ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="showDelete"
      title="Delete Mailing List"
      message="This mailing list will be permanently deleted."
      confirm-label="Delete"
      icon="mdi-trash-can-outline"
      color="error"
      @confirm="doDelete"
    />

    <!-- Preview recipients dialog -->
    <DomainContactsDialog v-if="contactsTarget" :key="contactsTarget.id" :domain="contactsTarget" @close="contactsTarget = null" />
    <RecipientPreviewDialog v-model="showPreview" :domain="previewTarget" />
    </template>
  </div>
</template>

<script lang="ts" setup>
import RuleGroupEditor from '@/components/RuleGroupEditor.vue'
import { emptyRule, prepareRules, ruleSummary, countRules, type RuleNode } from '@/utils/domainRules'
import { parseCsv, extractCsvColumn } from '@/utils/contactCsv'
import { useUiStore } from '@/stores/ui'
import { useServerPage } from '@/composables/useServerPage'
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDomainStore } from '@/stores/domain'
import { usePartnersStore } from '@/stores/partners'
import { usePreviewStore } from '@/stores/preview'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DomainContactsDialog from '@/components/DomainContactsDialog.vue'
import RecipientPreviewDialog from '@/components/RecipientPreviewDialog.vue'
import type { Domain } from '@/types/sms'

const authStore = useAuthStore()
const domainStore   = useDomainStore()
const { items, page, totalPages, search, loading, error, load } = useServerPage<Domain>(() => authStore.hasCompany ? '/domains/' : null, () => ({}), 12)
const partnersStore = usePartnersStore()
const previewStore  = usePreviewStore()

// Source table is fixed by the current backend workflow.
const FIXED_SOURCE_TABLE = 'res_partner'

const showDialog  = ref(false)
const showDelete  = ref(false)
const showPreview = ref(false)
const saving      = ref(false)
const editTarget  = ref<Domain | null>(null)
const deleteId    = ref<number | null>(null)
const previewTarget = ref<Domain | null>(null)

const emailCsvInput = ref<HTMLInputElement | null>(null)
const phoneCsvInput = ref<HTMLInputElement | null>(null)
const importingCsv = ref(false)
async function onCsvSelected(event: Event, kind: 'email' | 'phone') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || importingCsv.value || saving.value) return
  importingCsv.value = true
  const ui = useUiStore()
  try {
    const values = extractCsvColumn(parseCsv(await file.text()), kind)
    const label = kind === 'email' ? 'email addresses' : 'phone numbers'
    if (!values.length) { ui.toast(`No ${label} found in that file.`, 'warning'); return }
    const key = kind === 'email' ? 'emails' : 'phones'
    const existing = splitContacts(dlg[key])
    const merged = [...new Set([...existing, ...values])]
    dlg[key] = merged.join('\n')
    const added = merged.length - existing.length
    ui.toast(added ? `Added ${added} ${label} from CSV.` : 'Those contacts are already in the list.', added ? 'success' : 'info')
  } catch {
    ui.toast('Could not read that CSV file.', 'error')
  } finally { importingCsv.value = false }
}

const contactsTarget = ref<Domain | null>(null)
const editingLoading = ref(false)
const dlg = reactive({
  kind: 'rules' as 'rules' | 'list',
  emails: '',
  phones: '',
  name:         '',
  description:  '',
  source_table: FIXED_SOURCE_TABLE,
  rules:        [] as RuleNode[],
  rule_logic:   'AND' as 'AND' | 'OR',
})

function resetDlg() {
  dlg.kind = 'rules'; dlg.emails = ''; dlg.phones = ''
  dlg.name         = ''
  dlg.description  = ''
  dlg.source_table = FIXED_SOURCE_TABLE
  dlg.rules        = [emptyRule()]
  dlg.rule_logic   = 'AND'
}

function openCreate() {
  editTarget.value = null
  resetDlg()
  showDialog.value = true
}

async function openEdit(d: Domain) {
  if (editingLoading.value) return
  editingLoading.value = true
  let detail
  try { detail = d.kind === 'list' ? await domainStore.fetchOne(d.id) : null }
  finally { editingLoading.value = false }
  if (d.kind === 'list' && !detail) return
  dlg.kind = d.kind === 'list' ? 'list' : 'rules'
  dlg.emails = (detail?.emails || []).join('\n')
  dlg.phones = (detail?.phones || []).join('\n')
  editTarget.value = d
  dlg.name         = d.name
  dlg.description  = d.description || ''
  dlg.source_table = FIXED_SOURCE_TABLE   // always lock
  dlg.rules        = d.rules.length ? JSON.parse(JSON.stringify(d.rules)) : [emptyRule()]
  dlg.rule_logic   = d.rule_logic === 'OR' ? 'OR' : 'AND'
  showDialog.value = true
}

function confirmDel(id: number) {
  deleteId.value   = id
  showDelete.value = true
}

function splitContacts(value: string) { return [...new Set(value.split(/[,;\n\r]+/).map(item => item.trim()).filter(Boolean))] }

async function handleSave() {
  if (saving.value || importingCsv.value || !dlg.name.trim()) return
  let rules: RuleNode[] = []
  try { if (dlg.kind === 'rules') rules = prepareRules(dlg.rules, partnersStore.fields) }
  catch (error) { useUiStore().toast(error instanceof Error ? error.message : 'Check your conditions.', 'warning'); return }
  saving.value = true
  const payload = {
    name:         dlg.name,
    description:  dlg.description || null,
    ...(dlg.kind === 'list' ? { emails: splitContacts(dlg.emails), phones: splitContacts(dlg.phones) } : {
      source_table: FIXED_SOURCE_TABLE,
      rules,
      rule_logic: dlg.rule_logic,
    }),
  }
  try {
    if (editTarget.value) {
      const updated = await domainStore.update(editTarget.value.id, payload)
      if (!updated) return
      previewStore.invalidate(editTarget.value.id)
    } else {
      const created = await domainStore.create({ ...payload, kind: dlg.kind })
      if (!created) return
    }
    showDialog.value = false
    await load()
  } finally { saving.value = false }
}

async function doDelete() {
  if (deleteId.value === null) return
  await domainStore.remove(deleteId.value)
  previewStore.invalidate(deleteId.value)
  await load()
}

function openPreview(d: Domain) {
  if (d.kind === 'list') { contactsTarget.value = d; return }
  previewTarget.value = d
  showPreview.value   = true
}

onMounted(async () => {
  if (!authStore.hasCompany) return

  await partnersStore.fetchFields(authStore.activeCompany!.id)
})
</script>

<style scoped>
.domain-card {
  border: 1.5px solid rgb(var(--v-theme-card-border));
  transition: all 0.18s;
}
.domain-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.07) !important;
}
.domain-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.08);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

/* ── Rule rows ──────────────────────────────────────────────────── */
.rule-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.rule-row__fields {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  min-width: 0;
}
.rule-row__del {
  flex-shrink: 0;
  margin-top: 4px;
}

/* On small screens stack into 2-column grid: field + op on top, value below */
@media (max-width: 480px) {
  .rule-row {
    flex-direction: column;
    align-items: stretch;
  }
  .rule-row__fields {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }
  .rule-row__field { grid-column: 1; grid-row: 1; }
  .rule-row__op    { grid-column: 2; grid-row: 1; }
  .rule-row__val   { grid-column: 1 / -1; grid-row: 2; }
  .rule-row__del {
    align-self: flex-end;
    margin-top: -32px; /* pull up alongside the first row */
  }
}
</style>
