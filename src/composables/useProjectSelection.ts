import { reactive, ref, type Ref } from 'vue'
import type { ComponentExposed } from 'vue-component-type-helpers'
import type { SearchResult } from '@/lib/createFuzzySearcher'
import type { FocusViewModel } from '@/lib/FocusViewModel'
import type MapView from '@/components/MapView.vue'

/**
 * Owns the "currently viewed project" state (main panel + small preview) and the last
 * search result the user picked, plus the handlers that keep them in sync with the map.
 */
export function useProjectSelection(
  // ESLint's cross-file .vue type resolution doesn't fully resolve ComponentExposed<typeof MapView>
  // here (confirmed correct via `vue-tsc`); false positive.
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  mapViewRef: Ref<ComponentExposed<typeof MapView> | null>,
  isSmallScreen: Ref<boolean>,
  currentFocus: Ref<FocusViewModel | undefined>,
) {
  const defaultProjectState = {
    current: '',
    currentId: null as number | null,
    smallPreviewName: '',
  }
  const project = reactive({ ...defaultProjectState })
  const lastSelected = ref<SearchResult>()

  function showFullPreview(): void {
    if (!lastSelected.value) return
    Object.assign(project, {
      current: lastSelected.value.text,
      currentId: lastSelected.value.id,
      smallPreviewName: '',
    })
  }

  function clearProjectState(): void {
    Object.assign(project, defaultProjectState)
    mapViewRef.value?.clearHighlights()
  }

  function clearProjectStateIfSmallScreen(): void {
    if (isSmallScreen.value) clearProjectState()
  }

  function closeSmallPreview(): void {
    Object.assign(project, { smallPreviewName: '', currentId: null })
  }

  function repoSelected(repo: SearchResult): void {
    lastSelected.value = repo
    if (isSmallScreen.value) {
      Object.assign(project, { current: '', currentId: repo.id, smallPreviewName: repo.text })
    } else {
      Object.assign(project, { current: repo.text, currentId: repo.id, smallPreviewName: '' })
    }
  }

  function findProject(repo: SearchResult): void {
    lastSelected.value = lastSelected.value?.id === repo.id ? lastSelected.value : repo
    const selected = lastSelected.value
    mapViewRef.value?.makeVisible(selected.text, { center: [selected.lon, selected.lat], zoom: 10 }, selected.skipAnimation)
    if (isSmallScreen.value) {
      Object.assign(project, { currentId: selected.id, smallPreviewName: selected.text })
    } else {
      Object.assign(project, { current: selected.text, currentId: selected.id })
    }
    currentFocus.value?.handleCurrentProjectChange(selected.id)
    const coords = currentFocus.value?.getCoordinates(selected.id)
    if (coords) repoSelected(coords)
  }

  return {
    project,
    lastSelected,
    findProject,
    showFullPreview,
    clearProjectState,
    clearProjectStateIfSmallScreen,
    closeSmallPreview,
    repoSelected,
  }
}
