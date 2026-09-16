import { ref, type Ref } from 'vue'
import type { ComponentExposed } from 'vue-component-type-helpers'
import GroupViewModel from '@/lib/GroupViewModel'
import { FocusViewModel, type Repositories } from '@/lib/FocusViewModel'
import downloadGroupGraph from '@/lib/downloadGroupGraph'
import type MapView from '@/components/MapView.vue'

/**
 * Owns the "group" (largest repositories) and "focus" (connections) side-panel view models,
 * and the single place responsible for downloading a group's graph and building a FocusViewModel.
 */
export function useGraphFocus(
  // ESLint's cross-file .vue type resolution doesn't fully resolve ComponentExposed<typeof MapView>
  // here (confirmed correct via `vue-tsc`); false positive.
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  mapViewRef: Ref<ComponentExposed<typeof MapView> | null>,
) {
  const currentGroup = ref<GroupViewModel>()
  const currentFocus = ref<FocusViewModel>()
  const groupCache = new Map<number, GroupViewModel>()

  function getOrCreateGroup(groupId: number): GroupViewModel {
    let group = groupCache.get(groupId)
    if (!group) {
      group = new GroupViewModel()
      groupCache.set(groupId, group)
    }
    return group
  }

  /** Downloads the graph for a group and builds the focus view model for a repository within it. */
  async function loadFocus(repositoryId: number, groupId: number, label: string): Promise<void> {
    currentGroup.value = undefined
    try {
      const graph = await downloadGroupGraph(groupId)
      currentFocus.value = new FocusViewModel(repositoryId, groupId, label, graph)
    } catch {
      console.error(`Error: Failed to load graph for group ${String(groupId)}`)
    }
  }

  function showLargest(groupId: number, largest: Repositories[]): void {
    const group = getOrCreateGroup(groupId)
    group.setLargest(largest)
    currentFocus.value = undefined
    currentGroup.value = group
  }

  function closeGroupView(): void {
    currentGroup.value = undefined
    mapViewRef.value?.clearBorderHighlights()
  }

  function closeFocusView(): void {
    currentFocus.value = undefined
  }

  return { currentGroup, currentFocus, loadFocus, showLargest, closeGroupView, closeFocusView }
}
