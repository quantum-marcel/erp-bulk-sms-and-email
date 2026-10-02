import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import type { PartnerField, PartnerFieldsResponse } from '@/types/sms'

export const usePartnersStore = defineStore('partners', () => {
  let scopeRevision = 0
  let loadedCompanyId: number | null = null
  // ── State ──────────────────────────────────────────────────────────────────
  const fields        = ref<PartnerField[]>([])
  const loadingFields = ref(false)

  // ── Fetch available res.partner fields for this company, for building domain rules ──
  async function fetchFields(companyId: number, force = false): Promise<PartnerField[]> {
    if (!force && fields.value.length && loadedCompanyId === companyId) return fields.value
    const revision = scopeRevision
    const { run } = useApiCall()
    loadingFields.value = true
    const res = await run(() => get<PartnerFieldsResponse>(`/companies/${companyId}/partner-fields`), { silent: true })
    if (revision !== scopeRevision) return fields.value
    if (res) { fields.value = res.fields.map(field => ({ label: null, ttype: null, relation: null, searchable: true, supported: true, source: 'odoo', ...field })); loadedCompanyId = companyId }
    loadingFields.value = false
    return fields.value
  }

  function reset() {
    scopeRevision++
    loadingFields.value = false
    fields.value = []
    loadedCompanyId = null
  }

  function fieldLabel(name: string, fallback = name): string {
    return fields.value.find(field => field.name === name)?.label?.trim() || fallback
  }

  return {
    fields, loadingFields,
    fetchFields, fieldLabel, reset,
  }
})
