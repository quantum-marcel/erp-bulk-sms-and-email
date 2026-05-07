import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { post, setupHttpCallbacks } from '@/utils/http'
import type { AuthUser, AuthApiResponse, LdapLoginPayload } from '@/types/auth'

export const useAuthStore = defineStore(
  'auth',
  () => {
    // ── State ──────────────────────────────────────────────────────────────
    const token = ref<string | null>(null)
    const user  = ref<AuthUser | null>(null)
    const isLoading = ref(false)

    // ── Getters ────────────────────────────────────────────────────────────
    const isAuthenticated = computed(() => !!token.value && !!user.value)
    const isAdmin = computed(() => user.value?.role === 'admin')
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
        // Backend: POST /auth/login → { access_token, token_type, username, name, email }
        const res = await post<AuthApiResponse>('/auth/login', payload)

        token.value = res.access_token
        user.value = {
          username: res.username,
          fullName: res.name,
          email:    res.email,
          // Backend doesn't return a role yet — default to 'user'
          role: 'user',
        }
        return true
      } catch (err: any) {
        throw err
      } finally {
        isLoading.value = false
      }
    }

    async function checkAuth(): Promise<boolean> {
      _init()
      if (!token.value || !user.value) return false
      return true
    }

    function logout() {
      token.value = null
      user.value  = null
    }

    return { token, user, isLoading, isAuthenticated, isAdmin, userInitials, login, checkAuth, logout }
  },
  {
    persist: {
      key: (import.meta as any).env?.VITE_SESSION_KEY || 'newgas_sms',
      storage: typeof window !== 'undefined' ? sessionStorage : undefined,
    },
  }
)