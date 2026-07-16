import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, post, setupHttpCallbacks } from '@/utils/http'
import { useCampaignStore } from '@/stores/campaign'
import { useDomainStore } from '@/stores/domain'
import { useErpStore } from '@/stores/erp'
import type {
  AuthCompany,
  AuthRole,
  AuthRoleObject,
  AuthUser,
  AuthApiResponse,
  AuthMeResponse,
  LdapLoginPayload,
  SelectCompanyResponse,
} from '@/types/auth'

export const useAuthStore = defineStore(
  'auth',
  () => {
    // ── State ──────────────────────────────────────────────────────────────
    const token = ref<string | null>(null)
    const user  = ref<AuthUser | null>(null)
    const companies = ref<AuthCompany[]>([])
    const activeCompany = ref<AuthCompany | null>(null)
    const isLoading = ref(false)

    // ── Getters ────────────────────────────────────────────────────────────
    const isAuthenticated = computed(() => !!token.value && !!user.value)
    const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'super_admin')
    const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
    const hasCompany = computed(() => !!activeCompany.value?.id)
    const userInitials = computed(() => {
      if (!user.value?.fullName) return '?'
      return user.value.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    })

    // ── Actions ────────────────────────────────────────────────────────────
    function _init() {
      setupHttpCallbacks(
        () => token.value,
        () => logout()
      )
    }

    async function login(payload: LdapLoginPayload): Promise<boolean> {
      isLoading.value = true
      try {
        const res = await post<AuthApiResponse>('/auth/login', payload)

        token.value = res.access_token
        user.value = {
          username: res.username,
          fullName: res.name,
          email:    res.email,
          role: normalizeRole(res.role, res.username),
        }
        companies.value = res.companies
        activeCompany.value = res.active_company
        return true
      } catch (err: any) {
        throw err
      } finally {
        isLoading.value = false
      }
    }

    async function checkAuth(): Promise<boolean> {
      _init()
      if (!token.value) return false
      if (!user.value) return refreshMe()
      return true
    }

    async function refreshMe(): Promise<boolean> {
      _init()
      if (!token.value) return false
      try {
        const res = await get<AuthMeResponse>('/auth/me')
        user.value = {
          id: res.user_id,
          username: res.username,
          fullName: res.name || res.username,
          email: res.email,
          role: normalizeRole(res.role, res.username),
        }
        activeCompany.value = res.company_id && res.company_name
          ? { id: res.company_id, name: res.company_name }
          : null
        return true
      } catch {
        logout()
        return false
      }
    }

    async function selectCompany(companyId: number): Promise<boolean> {
      isLoading.value = true
      try {
        const res = await post<SelectCompanyResponse>('/auth/select-company', { company_id: companyId })
        token.value = res.access_token
        activeCompany.value = res.company

        const campaignStore = useCampaignStore()
        const domainStore = useDomainStore()
        const erpStore = useErpStore()
        campaignStore.reset()
        domainStore.reset()
        erpStore.reset()
        await Promise.all([
          campaignStore.fetchAll(true),
          domainStore.fetchAll(true),
        ])

        return true
      } finally {
        isLoading.value = false
      }
    }

    function logout() {
      token.value = null
      user.value  = null
      companies.value = []
      activeCompany.value = null
    }

    return {
      token, user, companies, activeCompany, isLoading,
      isAuthenticated, isAdmin, isSuperAdmin, hasCompany, userInitials,
      login, checkAuth, refreshMe, selectCompany, logout,
    }
  },
  {
    persist: {
      key: (import.meta as any).env?.VITE_SESSION_KEY || 'campaign_portal',
      storage: typeof window !== 'undefined' ? sessionStorage : undefined,
    },
  }
)

function normalizeRole(role: AuthRole | AuthRoleObject | null | undefined, username?: string): AuthRole {
  if (username === 'randoh') return 'super_admin'
  if (typeof role === 'string') return role === 'super_admin' ? 'super_admin' : 'admin'
  const roleValue = role?.code || role?.name || role?.role
  return roleValue === 'super_admin' ? 'super_admin' : 'admin'
}
