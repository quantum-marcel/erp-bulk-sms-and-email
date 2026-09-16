import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, post, patch, put, del } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import type { Company, SmsConfig, SmsConfigUpsert, CreateCompanyPayload, UpdateCompanyPayload } from '@/types/company'

export const useCompanyStore = defineStore('company', () => {
  const companies = ref<Company[]>([])
  const currentCompany = ref<Company | null>(null)
  const isLoading = ref(false)

  async function fetchAll(force = false) {
    if (!force && companies.value.length) return
    const { run } = useApiCall()
    isLoading.value = true
    try {
      const res = await run(() => get<Company[]>('/companies/'), { silent: true })
      if (res) companies.value = res
    } finally {
      isLoading.value = false
    }
  }

  async function fetchOne(id: number): Promise<Company | null> {
    const { run } = useApiCall()
    const res = await run(() => get<Company>(`/companies/${id}`), { silent: true })
    if (res) currentCompany.value = res
    return res
  }

  async function create(payload: CreateCompanyPayload): Promise<Company | null> {
    const { run } = useApiCall()
    const res = await run(
      () => post<Company>('/companies/', payload),
      { success: 'Company created' }
    )
    if (res) companies.value.unshift(res)
    return res
  }

  async function update(id: number, payload: UpdateCompanyPayload): Promise<Company | null> {
    const { run } = useApiCall()
    const res = await run(
      () => patch<Company>(`/companies/${id}`, payload),
      { success: 'Company updated' }
    )
    if (res) {
      const idx = companies.value.findIndex(c => c.id === id)
      if (idx !== -1) companies.value[idx] = res
      if (currentCompany.value?.id === id) currentCompany.value = res
    }
    return res
  }

  async function remove(id: number) {
    const { run } = useApiCall()
    await run(
      () => del<void>(`/companies/${id}`),
      { success: 'Company deleted' }
    )
    companies.value = companies.value.filter(c => c.id !== id)
    if (currentCompany.value?.id === id) currentCompany.value = null
  }

  async function fetchSmsConfigs(companyId: number) {
    const { run } = useApiCall()
    return run(() => get<SmsConfig[]>(`/companies/${companyId}/sms-configs`))
  }

  async function saveSmsConfig(companyId: number, provider: string, payload: SmsConfigUpsert) {
    const { run } = useApiCall()
    return run(() => put<SmsConfig>(`/companies/${companyId}/sms-configs/${encodeURIComponent(provider)}`, payload), { success: 'SMS provider settings saved' })
  }

  function reset() {
    companies.value = []
    currentCompany.value = null
  }

  return { companies, currentCompany, isLoading, fetchAll, fetchOne, create, update, remove, fetchSmsConfigs, saveSmsConfig, reset }
})
