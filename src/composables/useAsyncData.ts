import { ref, watchEffect } from 'vue'

/**
 * Runs `fetcher` reactively (re-running whenever any reactive value it reads changes,
 * e.g. a prop) and exposes its result alongside loading/error state, plus a manual `retry`.
 *
 * `fetcher` must read all of its reactive dependencies synchronously (before its first
 * `await`), same as any other Vue reactive effect.
 */
export function useAsyncData<T>(fetcher: () => Promise<T | undefined>) {
  const data = ref<T>()
  const isLoading = ref(true)
  const hasError = ref(false)

  async function load() {
    isLoading.value = true
    hasError.value = false

    try {
      const result = await fetcher()
      if (result === undefined) {
        hasError.value = true
      } else {
        data.value = result
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      hasError.value = true
    } finally {
      isLoading.value = false
    }
  }

  watchEffect(() => void load())

  return { data, isLoading, hasError, retry: load }
}
