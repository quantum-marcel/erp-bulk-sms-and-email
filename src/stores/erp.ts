import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import type { ErpTable, ErpField } from '@/types/sms'

export const useErpStore = defineStore('erp', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const tables        = ref<ErpTable[]>([])
  const fieldsCache   = ref<Record<string, ErpField[]>>({})   // keyed by table name
  const loadingTables = ref(false)
  const loadingFields = ref(false)

  // ── Fetch all ERP tables ───────────────────────────────────────────────────
  async function fetchTables(force = false) {
    if (!force && tables.value.length) return
    const { run } = useApiCall()
    loadingTables.value = true
    const res = await run(() => get<ErpTable[]>('/erp/tables'), { silent: true })
    if (res) tables.value = res
    loadingTables.value = false
  }

  // ── Fetch fields for a given table ────────────────────────────────────────
  async function fetchFields(tableName: string, force = false): Promise<ErpField[]> {
    if (!force && fieldsCache.value[tableName]) return fieldsCache.value[tableName]
    const { run } = useApiCall()
    loadingFields.value = true
    const res = await run(
      () => get<ErpField[]>(`/erp/tables/${tableName}/fields`),
      { silent: true }
    )
    if (res) fieldsCache.value[tableName] = res
    loadingFields.value = false
    return res ?? []
  }

  // ── Convenience: field names for a table (already cached) ─────────────────
  function getFieldNames(tableName: string): string[] {
    return (fieldsCache.value[tableName] ?? []).map(f => f.name)
  }

  return {
    tables, fieldsCache, loadingTables, loadingFields,
    fetchTables, fetchFields, getFieldNames,
  }
})