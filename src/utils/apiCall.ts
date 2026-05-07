import { ref } from 'vue'
import { useUiStore } from '@/stores/ui'

/**
 * Wraps any async API call with:
 * - local isLoading ref
 * - automatic error toast via uiStore
 * - optional success toast
 *
 * Usage:
 *   const { run, isLoading } = useApiCall()
 *   const result = await run(() => get<Foo>('/foo'), { success: 'Loaded!' })
 */
export function useApiCall() {
  const isLoading = ref(false)

  async function run<T>(
    fn: () => Promise<T>,
    options?: { success?: string; silent?: boolean }
  ): Promise<T | null> {
    const ui = useUiStore()
    isLoading.value = true

    try {
      const result = await fn()
      if (options?.success) {
        ui.toast(options.success, 'success')
      }
      return result
    } catch (err: any) {
      if (!options?.silent) {
        ui.toast(err?.message || 'An error occurred', 'error')
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  return { run, isLoading }
}
