import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, post, patch, del } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import type { Domain, CreateDomainPayload } from '@/types/sms'

export const useDomainStore = defineStore('domain', () => {
  const domains   = ref<Domain[]>([])
  const isLoading = ref(false)

  async function fetchAll(force = false) {
    if (!force && domains.value.length) return
    const { run } = useApiCall()
    isLoading.value = true
    const res = await run(() => get<Domain[]>('/domains/'), { silent: true })
    if (res) domains.value = res
    isLoading.value = false
  }

  async function create(payload: CreateDomainPayload): Promise<Domain | null> {
    const { run } = useApiCall()
    const res = await run(
      () => post<Domain>('/domains/', payload),
      { success: 'Mailing list created' }
    )
    if (res) domains.value.unshift(res)
    return res
  }

  async function update(id: number, payload: Partial<CreateDomainPayload>): Promise<Domain | null> {
    const { run } = useApiCall()
    const res = await run(
      () => patch<Domain>(`/domains/${id}`, payload),
      { success: 'Mailing list updated' }
    )
    if (res) {
      const idx = domains.value.findIndex(d => d.id === id)
      if (idx !== -1) domains.value[idx] = res
    }
    return res
  }

  async function remove(id: number) {
    const { run } = useApiCall()
    await run(
      () => del(`/domains/${id}`),
      { success: 'Mailing list deleted' }
    )
    domains.value = domains.value.filter(d => d.id !== id)
  }

  return { domains, isLoading, fetchAll, create, update, remove }
})
