import { fetchAllPages } from '@/utils/pagination'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, post, patch, del } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import type { DomainDetailOut, DomainUpdate } from '@/types/backend'
import type { Domain, CreateDomainPayload } from '@/types/sms'

export const useDomainStore = defineStore('domain', () => {
  let scopeRevision = 0
  const domains   = ref<Domain[]>([])
  const isLoading = ref(false)

  async function fetchAll(force = false) {
    const revision = scopeRevision
    if (!force && domains.value.length) return
    const { run } = useApiCall()
    isLoading.value = true
    const res = await run(() => fetchAllPages<Domain>(get, '/domains/', {}, () => revision === scopeRevision), { silent: true })
    if (revision !== scopeRevision) return
    if (res) domains.value = res
    isLoading.value = false
  }

  async function fetchOne(id: number): Promise<DomainDetailOut | null> {
    const revision = scopeRevision
    const { run } = useApiCall()
    const result = await run(() => get<DomainDetailOut>(`/domains/${id}`))
    return revision === scopeRevision ? result : null
  }

  async function create(payload: CreateDomainPayload): Promise<Domain | null> {
    const revision = scopeRevision
    const { run } = useApiCall()
    const res = await run(
      () => post<Domain>('/domains/', payload),
      { success: 'Mailing list created' }
    )
    if (revision !== scopeRevision) return null
    if (res) domains.value.unshift(res)
    return res
  }

  async function update(id: number, payload: DomainUpdate): Promise<Domain | null> {
    const revision = scopeRevision
    const { run } = useApiCall()
    const res = await run(
      () => patch<Domain>(`/domains/${id}`, payload),
      { success: 'Mailing list updated' }
    )
    if (revision !== scopeRevision) return null
    if (res) {
      const idx = domains.value.findIndex(d => d.id === id)
      if (idx !== -1) domains.value[idx] = res
    }
    return res
  }

  async function remove(id: number) {
    const revision = scopeRevision
    const { run } = useApiCall()
    const success = await run(
      async () => { await del<void>(`/domains/${id}`); return true },
      { success: 'Mailing list deleted' }
    )
    if (success && revision === scopeRevision) domains.value = domains.value.filter(d => d.id !== id)
  }

  function reset() {
    scopeRevision++
    isLoading.value = false
    domains.value = []
  }

  return { domains, isLoading, fetchAll, fetchOne, create, update, remove, reset }
})
