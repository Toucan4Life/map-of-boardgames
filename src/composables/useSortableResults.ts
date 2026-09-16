import { ref, computed } from 'vue'
import type { SearchResult } from '@/lib/createFuzzySearcher'

export type SortCriteria = 'name' | 'year' | 'rating' | 'complexity' | 'numRatings'

const comparators: Record<SortCriteria, (a: SearchResult, b: SearchResult) => number> = {
  name: (a, b) => a.text.localeCompare(b.text),
  year: (a, b) => Number(a.year || 0) - Number(b.year || 0),
  rating: (a, b) => (a.rating || 0) - (b.rating || 0),
  complexity: (a, b) => (a.weight || 0) - (b.weight || 0),
  numRatings: (a, b) => (a.size || 0) - (b.size || 0),
}

/**
 * Sorts a list of search results by a chosen criteria/direction, toggling direction when the
 * same criteria is picked twice. `onSortChange` fires whenever sorting changes (e.g. to reset pagination).
 */
export function useSortableResults(getResults: () => SearchResult[] | undefined, onSortChange?: () => void) {
  const sortBy = ref<SortCriteria>('name')
  const sortDirection = ref<'asc' | 'desc'>('asc')

  const sortedResults = computed(() => {
    const results = getResults()
    if (!results) return []
    const compare = comparators[sortBy.value]
    const sign = sortDirection.value === 'asc' ? 1 : -1
    return [...results].sort((a, b) => sign * compare(a, b))
  })

  function toggleSortDirection(): void {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  }

  function setSortBy(criteria: SortCriteria): void {
    if (sortBy.value === criteria) {
      toggleSortDirection()
    } else {
      sortBy.value = criteria
      sortDirection.value = 'asc'
    }
    onSortChange?.()
  }

  return { sortBy, sortDirection, sortedResults, toggleSortDirection, setSortBy }
}
