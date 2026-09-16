import { ref, computed } from 'vue'

/** Paginates a reactive list of items into fixed-size pages. */
export function usePagination<T>(getItems: () => T[], pageSize: number) {
  const currentPage = ref(1)

  const totalResults = computed(() => getItems().length)
  const totalPages = computed(() => Math.ceil(totalResults.value / pageSize))
  const paginatedResults = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return getItems().slice(start, start + pageSize)
  })

  function resetPage(): void {
    currentPage.value = 1
  }

  function nextPage(): void {
    if (currentPage.value < totalPages.value) currentPage.value++
  }

  function prevPage(): void {
    if (currentPage.value > 1) currentPage.value--
  }

  return { currentPage, totalResults, totalPages, paginatedResults, resetPage, nextPage, prevPage }
}
