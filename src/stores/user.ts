import { fetchAllPages } from '@/utils/pagination'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, patch, post } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import type {
  AppUser,
  CreateUserPayload,
  UpdateUserPayload,
  UserCompanyAssignment,
} from '@/types/user'

export const useUserStore = defineStore('user', () => {
  const users = ref<AppUser[]>([])
  const assignments = ref<UserCompanyAssignment[]>([])
  const currentUser = ref<AppUser | null>(null)
  const isLoading = ref(false)
  const assignmentsLoading = ref(false)

  async function fetchAll(force = false) {
    if (!force && users.value.length) return
    const { run } = useApiCall()
    isLoading.value = true
    try {
      const res = await run(() => fetchAllPages<AppUser>(get, '/users/'), { silent: true })
      if (res) users.value = res
    } finally {
      isLoading.value = false
    }
  }

  async function fetchOne(id: number): Promise<AppUser | null> {
    const { run } = useApiCall()
    const res = await run(() => get<AppUser>(`/users/${id}`), { silent: true })
    if (res) currentUser.value = res
    return res
  }

  async function create(payload: CreateUserPayload) {
    const { run } = useApiCall()
    const result = await run(() => post<AppUser>('/users/', payload), { success: 'User created' })
    if (result) { users.value.unshift(result); assignments.value = [] }
    return result
  }

  async function update(id: number, payload: UpdateUserPayload): Promise<AppUser | null> {
    const { run } = useApiCall()
    const res = await run(
      () => patch<AppUser>(`/users/${id}`, payload),
      { success: 'User updated' }
    )
    if (res) {
      if (payload.company_ids !== undefined && payload.company_ids !== null) assignments.value = []
      const idx = users.value.findIndex(u => u.id === id)
      if (idx !== -1) users.value[idx] = res
      if (currentUser.value?.id === id) currentUser.value = res
    }
    return res
  }

  async function fetchAssignments(force = false) {
    if (!force && assignments.value.length) return
    const { run } = useApiCall()
    assignmentsLoading.value = true
    try {
      const res = await run(() => fetchAllPages<UserCompanyAssignment>(get, '/users/assignments'), { silent: true })
      if (res) assignments.value = res
    } finally {
      assignmentsLoading.value = false
    }
  }

  async function fetchCompanyIds(user: AppUser): Promise<number[]> {
    // q is a substring search; match the immutable user ID after collecting every page.
    const rows = await fetchAllPages<UserCompanyAssignment>(get, '/users/assignments', { q: user.username })
    return [...new Set(rows.filter(row => row.user_id === user.id).map(row => row.company_id))]
  }

  function reset() {
    users.value = []
    assignments.value = []
    currentUser.value = null
  }

  return {
    users, assignments, currentUser, isLoading, assignmentsLoading,
    fetchAll, fetchOne, create, update, fetchAssignments, fetchCompanyIds, reset,
  }
})
