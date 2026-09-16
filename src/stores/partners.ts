import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import type { PartnerField } from '@/types/sms'

export const usePartnersStore = defineStore('partners', () => {
  let scopeRevision = 0
  // ── State ──────────────────────────────────────────────────────────────────
  const fields        = ref<PartnerField[]>([])
  const loadingFields = ref(false)

  // ── Fetch available res.partner fields for building domain rules ──────────
  async function fetchFields(force = false): Promise<PartnerField[]> {
    const revision = scopeRevision
    if (!force && fields.value.length) return fields.value
    const { run } = useApiCall()
    loadingFields.value = true
    const res = await run(() => get<PartnerField[]>('/partners/fields'), { silent: true })
    if (revision !== scopeRevision) return fields.value
    if (res) fields.value = res
    loadingFields.value = false
    return fields.value
  }

  function reset() {
    scopeRevision++
    loadingFields.value = false
    fields.value = []
  }

  function fieldLabel(name: string, fallback = name): string {
    return fields.value.find(field => field.name === name)?.label?.trim() || fallback
  }

  return {
    fields, loadingFields,
    fetchFields, fieldLabel, reset,
  }
})
