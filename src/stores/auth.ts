import { fetchPage } from '@/utils/pagination'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, post, setupHttpCallbacks } from '@/utils/http'
import { useCampaignStore } from '@/stores/campaign'
import { useDomainStore } from '@/stores/domain'
import { usePartnersStore } from '@/stores/partners'
import { resolveAuthRole } from '@/utils/authRole'
import { useCompanyStore } from '@/stores/company'
import { useUserStore } from '@/stores/user'
import { usePreviewStore } from '@/stores/preview'
import type {
  AuthCompany,
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
    const companySelectionConfirmed = ref(false)

    // ── Getters ────────────────────────────────────────────────────────────
    const isAuthenticated = computed(() => !!token.value && !!user.value)
    const isAdmin = computed(() => user.value?.role === 'admin')
    let sessionValidated = false
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
      _init()
      clearWorkspace()
      isLoading.value = true
      try {
        const res = await post<AuthApiResponse>('/auth/login', payload)

        token.value = res.access_token
        user.value = {
          username: res.username,
          fullName: res.name || res.username,
          email:    res.email,
          role: resolveAuthRole(res.role, res.is_admin),
        }
        companies.value = res.companies || []
        activeCompany.value = res.active_company
        await loadCompanyAccess(true)
        sessionValidated = true
        return true
      } catch (err: any) {
        logout()
        throw err
      } finally {
        isLoading.value = false
      }
    }

    async function checkAuth(): Promise<boolean> {
      _init()
      if (!token.value) return false
      if (!sessionValidated || !user.value) return refreshMe()
      return true
    }

    async function refreshMe(): Promise<boolean> {
      _init()
      if (!token.value) return false
      try {
        const previousRole = user.value?.role
        const res = await get<AuthMeResponse>('/auth/me')
        user.value = {
          id: res.user_id,
          username: res.username,
          fullName: res.name || res.username,
          email: res.email,
          role: resolveAuthRole(res.role, res.is_admin),
        }
        activeCompany.value = res.company_id && res.company_name
          ? { id: res.company_id, name: res.company_name }
          : null
        if (res.companies) companies.value = res.companies
        await loadCompanyAccess(previousRole !== user.value.role || (isAdmin.value && !companySelectionConfirmed.value))
        sessionValidated = true
        return true
      } catch {
        logout()
        return false
      }
    }

    function clearWorkspace() {
      useCampaignStore().reset()
      useDomainStore().reset()
      usePartnersStore().reset()
      usePreviewStore().reset()
    }

    async function loadCompanyAccess(requireAdminSelection = false) {
      if (isAdmin.value) {
        const page = await fetchPage<AuthCompany>(get, '/companies/', { limit: 20 })
        companies.value = page.items
        if (!requireAdminSelection && activeCompany.value && !companies.value.some(c => c.id === activeCompany.value?.id)) {
          try {
            activeCompany.value = await get<AuthCompany>(`/companies/${activeCompany.value.id}`)
            companies.value.push(activeCompany.value)
          } catch { activeCompany.value = null }
        }
        if (requireAdminSelection || !companies.value.some(c => c.id === activeCompany.value?.id)) {
          activeCompany.value = null
          companySelectionConfirmed.value = false
          clearWorkspace()
          const firstCompany = companies.value[0]
          if (firstCompany) {
            const selected = await post<SelectCompanyResponse>('/auth/select-company', { company_id: firstCompany.id })
            token.value = selected.access_token
            activeCompany.value = selected.company
            companySelectionConfirmed.value = true
          }
        }
      } else {
        // Company access comes from the backend, never from a username or UI role.
        const assigned = companies.value.length === 1 ? companies.value[0] : null
        if (assigned && activeCompany.value?.id !== assigned.id) {
          const selected = await post<SelectCompanyResponse>('/auth/select-company', { company_id: assigned.id })
          token.value = selected.access_token
          activeCompany.value = selected.company
        }
        companies.value = activeCompany.value ? [activeCompany.value] : assigned ? [assigned] : []
        companySelectionConfirmed.value = !!activeCompany.value
      }
    }

    async function refreshCompanies() {
      await loadCompanyAccess(isAdmin.value && !companySelectionConfirmed.value)
    }

    function companyName(id: number) {
      return companies.value.find(company => company.id === id)?.name
        || (activeCompany.value?.id === id ? activeCompany.value.name : `Company #${id}`)
    }

    async function selectCompany(companyId: number): Promise<boolean> {
      if (isLoading.value) throw new Error('Wait for company selection to finish.')
      if (!isAdmin.value && !companies.value.some(company => company.id === companyId)) throw new Error('You do not have access to this company.')
      if (!isAdmin.value && companyId !== companies.value[0]?.id) throw new Error('You can only use your assigned company.')
      isLoading.value = true
      try {
        const res = await post<SelectCompanyResponse>('/auth/select-company', { company_id: companyId })
        token.value = res.access_token
        activeCompany.value = res.company
        if (!companies.value.some(company => company.id === res.company.id)) companies.value.push(res.company)
        companySelectionConfirmed.value = true

        const campaignStore = useCampaignStore()
        const domainStore = useDomainStore()
        const partnersStore = usePartnersStore()
        const previewStore = usePreviewStore()
        campaignStore.reset()
        domainStore.reset()
        partnersStore.reset()
        previewStore.reset()

        return true
      } finally {
        isLoading.value = false
      }
    }

    function logout() {
      clearWorkspace()
      useCompanyStore().reset()
      useUserStore().reset()
      sessionValidated = false
      companySelectionConfirmed.value = false
      token.value = null
      user.value  = null
      companies.value = []
      activeCompany.value = null
    }

    return {
      token, user, companies, activeCompany, isLoading, companySelectionConfirmed,
      isAuthenticated, isAdmin, hasCompany, userInitials, companyName, refreshCompanies,
      login, checkAuth, refreshMe, selectCompany, logout,
    }
  },
  {
    persist: {
      paths: ['token', 'user', 'companies', 'activeCompany', 'companySelectionConfirmed'],
      key: (import.meta as any).env?.VITE_SESSION_KEY || 'campaign_portal',
      storage: typeof window !== 'undefined' ? sessionStorage : undefined,
    },
  }
)
