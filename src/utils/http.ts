import axios, { type AxiosInstance, type AxiosResponse } from 'axios'

let _logoutCallback: (() => void) | null = null
let _getToken: (() => string | null) | null = null

export function setupHttpCallbacks(
  getToken: () => string | null,
  logout: () => void
) {
  _getToken = getToken
  _logoutCallback = logout
}

const http: AxiosInstance = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor: auto-inject token ──────────────────────────────────
http.interceptors.request.use(
  (config) => {
    if (_getToken) {
      const token = _getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: normalise errors, handle 401 ──────────────────────
http.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(new Error(error.message || 'Network error'))
    }

    if (error.response.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login')

      if (!isLoginRequest) {
        // 401 on a protected route = session expired
        if (_logoutCallback) _logoutCallback()
        return Promise.reject(new Error('Session expired. Please log in again.'))
      }

      // 401 on login = wrong credentials — fall through to extract backend message
    }

    const msg =
      error.response.data?.detail?.[0]?.msg ||
      error.response.data?.detail ||
      error.response.data?.message ||
      'Something went wrong'

    return Promise.reject(new Error(msg))
  }
)

// ── Typed helpers ────────────────────────────────────────────────────────────
export const get = <T>(url: string, params?: object): Promise<T> =>
  http.get<T>(url, { params }).then((r) => r.data)

export const post = <T>(url: string, data?: unknown): Promise<T> =>
  http.post<T>(url, data).then((r) => r.data)

export const put = <T>(url: string, data?: unknown): Promise<T> =>
  http.put<T>(url, data).then((r) => r.data)

export const patch = <T>(url: string, data?: unknown): Promise<T> =>
  http.patch<T>(url, data).then((r) => r.data)

export const del = <T>(url: string): Promise<T> =>
  http.delete<T>(url).then((r) => r.data)

export default http