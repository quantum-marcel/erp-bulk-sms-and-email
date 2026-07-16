<template>
  <div>
    <div class="d-flex align-start align-sm-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="font-weight-bold" style="font-size:clamp(17px,4vw,22px)">Mailing Lists</h2>
        <p class="text-medium-emphasis text-body-2">
          Domains define who receives your campaigns — filtered from your Odoo data.
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" rounded="xl" elevation="0" @click="openCreate">
        New List
      </v-btn>
    </div>

    <div v-if="domainStore.isLoading" class="d-flex justify-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="domainStore.domains.length === 0" class="text-center py-16">
      <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-account-group-outline</v-icon>
      <p class="font-weight-semibold text-h6 mb-1">No mailing lists yet</p>
      <p class="text-medium-emphasis text-body-2 mb-4">Create your first list to start targeting recipients.</p>
      <v-btn color="primary" rounded="xl" prepend-icon="mdi-plus" elevation="0" @click="openCreate">
        Create Mailing List
      </v-btn>
    </div>
    

    <v-row v-else dense>
      <v-col v-for="d in domainStore.domains" :key="d.id" cols="12" sm="6" md="4">
        <v-card rounded="xl" elevation="0" class="pa-4 domain-card">
          <div class="d-flex align-center mb-3">
            <div class="domain-icon mr-3">
              <v-icon color="primary" size="18">mdi-account-group-outline</v-icon>
            </div>
            <div class="grow" style="min-width:0">
              <p class="font-weight-semibold text-body-2 text-truncate">{{ d.name }}</p>
              <p class="text-caption text-medium-emphasis">{{ d.source_table }}</p>
            </div>
            <div class="d-flex ga-1">
              <v-btn icon size="x-small" variant="text" @click="openEdit(d)">
                <v-icon size="15">mdi-pencil-outline</v-icon>
              </v-btn>
              <v-btn icon size="x-small" variant="text" color="error" @click="confirmDel(d.id)">
                <v-icon size="15">mdi-trash-can-outline</v-icon>
              </v-btn>
            </div>
          </div>

          <p v-if="d.description" class="text-caption text-medium-emphasis mb-3">{{ d.description }}</p>

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
              {{ rule.field }} {{ OP_LABELS[rule.op] || rule.op }} {{ rule.value }}
            </v-chip>
            <v-chip v-if="d.rules.length > 3" size="x-small" label variant="tonal" color="secondary" class="mb-1">
              +{{ d.rules.length - 3 }} more
            </v-chip>
          </div>

          <div class="d-flex align-center justify-space-between">
            <v-chip size="x-small" :color="d.rule_logic === 'AND' ? 'primary' : 'info'" label variant="tonal">
              {{ d.rule_logic }}
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

    <!-- Create / Edit dialog -->
    <v-dialog v-model="showDialog" :max-width="580" :fullscreen="$vuetify.display.smAndDown" persistent>
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

          <!-- Source table — locked to res_partner for this portal -->
          <div class="mb-4">
            <p class="text-caption text-medium-emphasis mb-1 ml-1">Source Table</p>
            <div
              class="d-flex align-center px-4"
              style="height:44px;border-radius:12px;border:1px solid rgba(var(--v-border-color),var(--v-border-opacity));background:rgb(var(--v-theme-surface-variant));"
            >
              <span class="text-body-2 flex-grow-1" style="color:rgba(var(--v-theme-on-surface),0.55)">res_partner</span>
              <v-icon size="16" color="medium-emphasis">mdi-lock-outline</v-icon>
            </div>
            <p class="text-caption text-medium-emphasis mt-1 ml-1">Fixed to res_partner for this deployment.</p>
          </div>

          <div class="d-flex align-center justify-space-between mb-2 mt-4">
            <p class="text-caption font-weight-semibold text-uppercase" style="letter-spacing:0.8px">Filter Rules</p>
            <v-btn
              size="x-small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-plus"
              :disabled="erpStore.loadingFields"
              @click="addRule"
            >
              Add Rule
            </v-btn>
          </div>

          <div v-if="erpStore.loadingFields" class="d-flex align-center ga-2 mb-3 text-medium-emphasis text-caption">
            <v-progress-circular indeterminate size="14" width="2" color="primary" />
            Loading fields…
          </div>

          <v-alert
            v-else-if="!erpStore.loadingFields && availableFields.length === 0"
            type="warning"
            variant="tonal"
            density="compact"
            rounded="lg"
            class="mb-3 text-caption"
          >
            Could not load fields for <strong>{{ dlg.source_table }}</strong>. Rules will be unavailable.
          </v-alert>

          <div v-for="(rule, i) in dlg.rules" :key="i" class="rule-row mb-3">
            <div class="rule-row__fields">
              <!-- Field -->
              <v-autocomplete
                v-model="rule.field"
                :items="fieldItems"
                item-title="label"
                item-value="value"
                placeholder="Field"
                variant="outlined"
                density="compact"
                rounded="lg"
                hide-details
                :loading="erpStore.loadingFields"
                no-data-text="No fields available"
                class="rule-row__field"
              />

              <!-- Operator -->
              <v-select
                v-model="rule.op"
                :items="ops"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="compact"
                rounded="lg"
                hide-details
                class="rule-row__op"
              />

              <!-- Value -->
              <v-text-field
                v-if="rule.op !== 'is_null' && rule.op !== 'is_not_null'"
                v-model="rule.value"
                placeholder="Value"
                variant="outlined"
                density="compact"
                rounded="lg"
                hide-details
                class="rule-row__val"
              />
              <div v-else class="rule-row__val" />
            </div>

            <!-- Delete button — sits to the right on desktop, below on mobile -->
            <v-btn icon size="x-small" variant="text" color="error" class="rule-row__del" @click="removeRule(i)">
              <v-icon size="14">mdi-close</v-icon>
            </v-btn>
          </div>

          <v-btn-toggle v-if="dlg.rules.length > 1" v-model="dlg.rule_logic" mandatory density="compact" class="mt-2">
            <v-btn value="AND" size="small">AND</v-btn>
            <v-btn value="OR"  size="small">OR</v-btn>
          </v-btn-toggle>
        </v-card-text>

        <v-card-actions class="px-6 pb-6 pt-0 ga-2">
          <v-spacer />
          <v-btn variant="tonal" rounded="lg" @click="showDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            :loading="saving"
            :disabled="!dlg.name"
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
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useDomainStore } from '@/stores/domain'
import { useErpStore }    from '@/stores/erp'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { Domain } from '@/types/sms'

const domainStore = useDomainStore()
const erpStore    = useErpStore()

// Source table is fixed by the current backend workflow.
const FIXED_SOURCE_TABLE = 'res_partner'

const showDialog = ref(false)
const showDelete = ref(false)
const saving     = ref(false)
const editTarget = ref<Domain | null>(null)
const deleteId   = ref<number | null>(null)

const OP_LABELS = {
  eq:          'is equal to',
  neq:         'is not equal to',
  gt:          'is greater than',
  gte:         'is greater than or equal to',
  lt:          'is less than',
  lte:         'is less than or equal to',
  like:        'contains (case-sensitive)',
  ilike:       'contains',
  in:          'is in',
  not_in:      'is not in',
  is_null:     'is empty',
  is_not_null: 'is not empty',
} as const

type DomainRuleOp = keyof typeof OP_LABELS

const ops = Object.entries(OP_LABELS).map(([value, label]) => ({
  value,
  label,
})) as Array<{ value: DomainRuleOp; label: string }>

// Fields fetched from ERP for res_partner
const availableFields = computed(() => erpStore.fieldsCache[FIXED_SOURCE_TABLE] ?? [])

const fieldItems = computed(() =>
  availableFields.value.map(f => ({
    value: f.name,
    label: f.name,
  }))
)

const dlg = reactive({
  name:         '',
  description:  '',
  source_table: FIXED_SOURCE_TABLE,
  rules:        [] as { field: string; op: DomainRuleOp; value: string }[],
  rule_logic:   'AND' as 'AND' | 'OR',
})

function resetDlg() {
  dlg.name         = ''
  dlg.description  = ''
  dlg.source_table = FIXED_SOURCE_TABLE
  dlg.rules        = []
  dlg.rule_logic   = 'AND'
}

function openCreate() {
  editTarget.value = null
  resetDlg()
  showDialog.value = true
}

function openEdit(d: Domain) {
  editTarget.value = d
  dlg.name         = d.name
  dlg.description  = d.description || ''
  dlg.source_table = FIXED_SOURCE_TABLE   // always lock
  dlg.rules        = d.rules.map(r => ({ ...r, value: r.value == null ? '' : String(r.value) }))
  dlg.rule_logic   = d.rule_logic
  showDialog.value = true
}

function addRule() {
  dlg.rules.push({ field: '', op: 'eq', value: '' })
}

function removeRule(i: number) {
  dlg.rules.splice(i, 1)
}

function confirmDel(id: number) {
  deleteId.value   = id
  showDelete.value = true
}

async function handleSave() {
  saving.value = true
  const payload = {
    name:         dlg.name,
    description:  dlg.description || undefined,
    source_table: FIXED_SOURCE_TABLE,
    rules:        dlg.rules as any,
    rule_logic:   dlg.rule_logic,
  }
  if (editTarget.value) {
    await domainStore.update(editTarget.value.id, payload)
  } else {
    await domainStore.create(payload)
  }
  saving.value     = false
  showDialog.value = false
}

async function doDelete() {
  if (deleteId.value === null) return
  await domainStore.remove(deleteId.value)
}

onMounted(async () => {
  domainStore.fetchAll()
  await erpStore.fetchFields(FIXED_SOURCE_TABLE)
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
