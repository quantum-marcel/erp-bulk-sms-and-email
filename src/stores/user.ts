import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, patch, post, del } from '@/utils/http'
import { useApiCall } from '@/utils/apiCall'
import type {
  AppUser,
  CreateUserCompanyAssignmentPayload,
  UpdateUserPayload,
  UserCompanyAssignment,
  UserCompanyAssignmentResponse,
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
      const res = await run(() => get<AppUser[]>('/users/'), { silent: true })
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

  async function update(id: number, payload: UpdateUserPayload): Promise<AppUser | null> {
    const { run } = useApiCall()
    const res = await run(
      () => patch<AppUser>(`/users/${id}`, payload),
      { success: 'User updated' }
    )
    if (res) {
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
      const res = await run(() => get<UserCompanyAssignment[]>('/users/assignments'), { silent: true })
      if (res) assignments.value = res
    } finally {
      assignmentsLoading.value = false
    }
  }

  async function assign(payload: CreateUserCompanyAssignmentPayload): Promise<UserCompanyAssignment | null> {
    const { run } = useApiCall()
    const res = await run(
      () => post<UserCompanyAssignmentResponse>('/users/assignments', payload),
      { success: 'User assigned to company' }
    )
    if (!res) return null

    const assignment = { ...res, username: payload.username }
    assignments.value.unshift(assignment)
    return assignment
  }

  async function removeAssignment(id: number) {
    const { run } = useApiCall()
    await run(
      () => del<void>(`/users/assignments/${id}`),
      { success: 'Assignment removed' }
    )
    assignments.value = assignments.value.filter(a => a.id !== id)
  }

  function reset() {
    users.value = []
    assignments.value = []
    currentUser.value = null
  }

  return {
    users, assignments, currentUser, isLoading, assignmentsLoading,
    fetchAll, fetchOne, update, fetchAssignments, assign, removeAssignment, reset,
  }
})
