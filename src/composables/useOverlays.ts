import { ref } from 'vue'
import type { SearchResult } from '@/lib/createFuzzySearcher'

export interface ContextMenuState {
  left: string
  top: string
  items: { text: string; click: () => void }[]
}

const ADV_SEARCH_HINT_DISMISSED_KEY = 'advSearchHintDismissed'

/** Owns the small overlay/popover pieces of UI: about panel, advanced search, unsaved-changes banner, context menu. */
export function useOverlays() {
  const aboutVisible = ref(false)
  const advSearchVisible = ref(false)
  const advSearchResults = ref<SearchResult[]>()
  const unsavedChangesVisible = ref(false)
  const showAdvSearchHint = ref(!localStorage.getItem(ADV_SEARCH_HINT_DISMISSED_KEY))
  const contextMenu = ref<ContextMenuState>()

  function dismissAdvSearchHint(): void {
    showAdvSearchHint.value = false
    localStorage.setItem(ADV_SEARCH_HINT_DISMISSED_KEY, 'true')
  }

  function toggleAdvSearch(): void {
    advSearchVisible.value = !advSearchVisible.value
    if (showAdvSearchHint.value) dismissAdvSearchHint()
  }

  function closeAdvSearch(): void {
    advSearchVisible.value = false
    advSearchResults.value = undefined
  }

  function handleContextMenuItem(item: { text: string; click: () => void }): void {
    contextMenu.value = undefined
    item.click()
  }

  return {
    aboutVisible,
    advSearchVisible,
    advSearchResults,
    unsavedChangesVisible,
    showAdvSearchHint,
    contextMenu,
    dismissAdvSearchHint,
    toggleAdvSearch,
    closeAdvSearch,
    handleContextMenuItem,
  }
}
