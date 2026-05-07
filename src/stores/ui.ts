import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useDisplay } from 'vuetify'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

export const useUiStore = defineStore('ui', () => {
  const { mdAndDown } = useDisplay()

  // ── Nav drawer ─────────────────────────────────────────────────
  // On mobile: temporary drawer (starts closed)
  // On desktop: permanent drawer (always visible, can rail-collapse)
  const drawerOpen  = ref(true)   // open/closed for temporary (mobile)
  const drawerRail  = ref(false)  // collapsed/expanded for permanent (desktop)
  const isMobile    = ref(mdAndDown.value)

  watch(
    () => mdAndDown.value,
    (mobile) => {
      isMobile.value  = mobile
      drawerOpen.value = !mobile   // close by default on mobile
    },
    { immediate: true }
  )

  function toggleDrawer() {
    if (isMobile.value) {
      drawerOpen.value = !drawerOpen.value
    } else {
      drawerRail.value = !drawerRail.value
    }
  }

  // ── Toast / snackbar ──────────────────────────────────────────
  const toasts = ref<Toast[]>([])
  let _id = 0

  function toast(message: string, type: ToastType = 'info', ms = 4200) {
    const id = ++_id
    toasts.value.push({ id, message, type })
    setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, ms)
  }
  function dismissToast(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    drawerOpen, drawerRail, isMobile,
    toggleDrawer,
    toasts, toast, dismissToast,
  }
})
