<script setup lang="ts">
import { ref, onBeforeUnmount, computed } from 'vue'
import TypeAhead from './components/TypeAhead.vue'
import GithubRepository from './components/GithubRepository.vue'
import SmallPreview from './components/SmallPreview.vue'
import About from './components/AboutComp.vue'
import advSearch from './components/AdvSearch.vue'
import UnsavedChanges from './components/UnsavedChanges.vue'
import LargestRepositories from './components/LargestRepositories.vue'
import FocusRepository from './components/FocusRepository.vue'
import LegendCard from './components/LegendCard.vue'
import MapView from './components/MapView.vue'
import type { Repositories } from './lib/FocusViewModel'
import type { AdvSearchResult } from './components/AdvSearch.vue'
import type { ContextMenuState } from './composables/useOverlays'
import type { ComponentExposed } from 'vue-component-type-helpers'
import { useResponsiveScreen } from './composables/useResponsiveScreen'
import { useGraphFocus } from './composables/useGraphFocus'
import { useProjectSelection } from './composables/useProjectSelection'
import { useOverlays } from './composables/useOverlays'

// ESLint's cross-file .vue type resolution doesn't fully resolve ComponentExposed<typeof MapView>
// here (confirmed correct via `vue-tsc`); false positive.
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const mapViewRef = ref<ComponentExposed<typeof MapView> | null>(null)
const hasUnsavedChanges = ref(false)
const loadedPlaces = ref<GeoJSON.FeatureCollection<GeoJSON.Point>>()

const { isSmallScreen } = useResponsiveScreen()
const { currentGroup, currentFocus, loadFocus, showLargest, closeGroupView, closeFocusView } = useGraphFocus(mapViewRef)
const { project, lastSelected, findProject, showFullPreview, clearProjectState, clearProjectStateIfSmallScreen, closeSmallPreview, repoSelected } =
  useProjectSelection(mapViewRef, isSmallScreen, currentFocus)
const {
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
} = useOverlays()

const typeAheadVisible = computed(() => !(isSmallScreen.value && currentGroup.value && !project.current))

async function listCurrentConnections() {
  if (!lastSelected.value) {
    console.warn('No last selected repository to list connections for.')
    return
  }
  currentFocus.value?.disposeSubgraphViewer()
  contextMenu.value = undefined
  advSearchVisible.value = false
  const groupId = lastSelected.value.groupId ?? (await mapViewRef.value?.getGroupIdAt(lastSelected.value.lat, lastSelected.value.lon))
  if (groupId !== undefined) {
    await loadFocus(lastSelected.value.id, groupId, lastSelected.value.text)
  }
}

async function search(params: AdvSearchResult) {
  const results = await mapViewRef.value?.highlightNode({
    minWeight: params.minWeight ?? 0,
    maxWeight: params.maxWeight ?? 10,
    minRating: params.minRating ?? 0,
    maxRating: params.maxRating ?? 10,
    minNumRatings: params.minNumRatings ?? 1,
    maxNumRatings: params.maxNumRatings ?? 150000,
    minPlaytime: params.minPlaytime ?? 0,
    maxPlaytime: params.maxPlaytime ?? 1000,
    playerChoice: params.playerChoice ?? 0,
    minPlayers: params.minPlayers ?? 1,
    maxPlayers: params.maxPlayers ?? 20,
    minYear: params.minYear ?? 1900,
    maxYear: params.maxYear ?? new Date().getFullYear(),
    tags: params.tags,
  })
  advSearchResults.value = results || []
}

function showLargestHandler(groupId: number, largest: Repositories[]) {
  showLargest(groupId, largest)
  advSearchVisible.value = false
}

async function focusOnRepoHandler(repo: number, groupId: number, label: string) {
  currentGroup.value = undefined
  advSearchVisible.value = false
  await loadFocus(repo, groupId, label)
}

function unsavedChangesHandler(has: boolean) {
  hasUnsavedChanges.value = has
}

function showContextMenuHandler(menu: ContextMenuState | undefined) {
  contextMenu.value = menu
}

function labelEditorLoadedHandler(places: GeoJSON.FeatureCollection<GeoJSON.Point>) {
  loadedPlaces.value = places
}

onBeforeUnmount(() => mapViewRef.value?.dispose())
</script>

<template>
  <div>
    <!-- Skip to content link for keyboard navigation -->
    <a href="#main-map" class="skip-link">Skip to map</a>

    <!-- Screen reader announcements for dynamic content -->
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
      <span v-if="project.current">Viewing details for {{ project.current }}</span>
      <span v-else-if="currentFocus">Viewing connections for {{ currentFocus.name }}</span>
      <span v-else-if="currentGroup">Viewing regional games</span>
    </div>

    <!-- MapLibre Map -->
    <MapView
      id="main-map"
      ref="mapViewRef"
      class="map-container"
      role="application"
      aria-label="Interactive map of board games"
      @focus-on-repo="focusOnRepoHandler"
      @show-context-menu="showContextMenuHandler"
      @repo-selected="repoSelected"
      @show-largest-in-group="showLargestHandler"
      @label-editor-loaded="labelEditorLoadedHandler"
      @unsaved-changes-detected="unsavedChangesHandler"
    />
    <!-- Unsaved changes banner -->
    <div v-if="hasUnsavedChanges" class="unsaved-changes">
      You have unsaved labels in local storage.
      <a href="#" class="normal" @click.prevent="unsavedChangesVisible = true">Click here</a>
      to see them.
    </div>

    <!-- Legend Card -->
    <LegendCard />

    <!-- Made by -->
    <div class="made-by">
      <div>
        Made by
        <a class="normal" aria-label="Made by Toucan4Life, inspired by @anvaka" target="_blank" href="https://github.com/Toucan4Life">Toucan4Life</a>,
        inspired by
        <a class="normal" aria-label="Inspired by @anvaka" target="_blank" href="https://github.com/Anvaka">Anvaka</a>
      </div>
      <div>
        <a href="https://boardgamegeek.com/"
          ><img
            border="0"
            src="https://cf.geekdo-images.com/HZy35cmzmmyV9BarSuk6ug__small/img/gbE7sulIurZE_Tx8EQJXnZSKI6w=/fit-in/200x150/filters:strip_icc()/pic7779581.png"
            alt="User: dakarp"
        /></a>
      </div>
    </div>

    <!-- Right panel views -->
    <largest-repositories
      v-if="currentGroup"
      :repos="currentGroup"
      class="right-panel"
      role="complementary"
      aria-label="Regional games list"
      @selected="findProject"
      @close="closeGroupView"
    />

    <focus-repository
      v-if="currentFocus"
      :vm="currentFocus"
      class="right-panel focus-panel"
      role="complementary"
      aria-label="Game connections"
      @selected="findProject"
      @close="closeFocusView"
      @cleared="clearProjectStateIfSmallScreen"
      @repo-selected="repoSelected"
    />

    <!-- Full repository view -->
    <github-repository
      v-if="project.current && project.currentId"
      :id="project.currentId"
      :name="project.current"
      role="complementary"
      aria-label="Game details panel"
      @list-connections="listCurrentConnections"
    />

    <!-- Search bar -->
    <form v-if="typeAheadVisible" class="search-box" role="search" aria-label="Game search" @submit.prevent>
      <type-ahead
        placeholder="Find Game"
        :show-clear-button="project.current ? 'true' : 'false'"
        :query="project.current"
        @menu-clicked="aboutVisible = true"
        @show-advanced-search="toggleAdvSearch"
        @selected="findProject"
        @before-clear="clearProjectState"
        @cleared="clearProjectState"
      />
    </form>

    <!-- Advanced Search Hint Banner -->
    <transition name="slide-down">
      <div v-if="typeAheadVisible && showAdvSearchHint" class="adv-search-hint" role="status" aria-live="polite">
        <div class="hint-content">
          <svg class="hint-icon" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span class="hint-text">
            <strong>New to the map?</strong> Use <strong>Advanced Search</strong> to filter games by rating, complexity, player count, and more!
          </span>
        </div>
        <button class="hint-close" aria-label="Dismiss hint" @click="dismissAdvSearchHint">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </transition>

    <!-- Small preview -->
    <transition name="slide-bottom">
      <small-preview
        v-if="project.smallPreviewName && project.currentId"
        :id="project.currentId"
        :name="project.smallPreviewName"
        class="small-preview"
        @show-full-preview="showFullPreview"
        @close="closeSmallPreview"
      />
    </transition>

    <!-- Context menu -->
    <div v-if="contextMenu" class="context-menu" :style="{ left: contextMenu.left, top: contextMenu.top }">
      <a v-for="(item, key) in contextMenu.items" :key="key" href="#" @click.prevent="handleContextMenuItem(item)">
        {{ item.text }}
      </a>
    </div>

    <!-- Slide-in overlays -->
    <transition name="slide-top">
      <unsaved-changes v-if="unsavedChangesVisible" :geojson="loadedPlaces" class="changes-window" @close="unsavedChangesVisible = false" />
    </transition>
    <about v-model:is-open="aboutVisible" @close="aboutVisible = false" />
    <advSearch
      v-model:is-open="advSearchVisible"
      :search-results="advSearchResults"
      @search="search"
      @result-selected="findProject"
      @close="closeAdvSearch"
    />
  </div>
</template>

<style scoped>
/* ==========================================
   LAYOUT
   ========================================== */
.map-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

/* ==========================================
   MADE BY ATTRIBUTION
   ========================================== */
.made-by {
  position: fixed;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: var(--backdrop-blur-sm);
  padding: var(--space-1);
  font-size: var(--text-sm);
  color: #ffffff;
  z-index: var(--z-raised);
  border-top-left-radius: var(--radius-sm);
}

.made-by a {
  color: var(--accent-400);
  transition: color var(--duration-fast) var(--ease-out);
}

.made-by a:hover {
  color: var(--accent-300);
}

/* ==========================================
   SEARCH BOX
   ========================================== */
.search-box {
  position: absolute;
  box-shadow: var(--shadow-lg);
  height: 48px;
  font-size: var(--text-md);
  margin-top: var(--space-4);
  padding: 0;
  cursor: text;
  left: var(--space-2);
  top: var(--space-2);
  width: calc(var(--sidebar-width) - var(--space-2));
  z-index: var(--z-modal);
}

/* ==========================================
   ADVANCED SEARCH HINT BANNER
   ========================================== */
.adv-search-hint {
  position: absolute;
  left: var(--space-2);
  top: 68px;
  width: calc(var(--sidebar-width) - var(--space-2));
  background: linear-gradient(135deg, var(--accent-50), var(--accent-100));
  border: 2px solid var(--accent-400);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-dropdown);
  animation: subtle-bounce 0.5s ease-out;
}

@keyframes subtle-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.hint-content {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  flex: 1;
}

.hint-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--accent-600);
  margin-top: 2px;
}

.hint-text {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--accent-900);
}

.hint-text strong {
  font-weight: var(--font-semibold);
  color: var(--accent-700);
}

.hint-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--accent-600);
  transition: color var(--duration-fast) var(--ease-out);
}

.hint-close:hover {
  color: var(--accent-800);
}

.hint-close svg {
  width: 100%;
  height: 100%;
}

/* ==========================================
   PANELS & OVERLAYS
   ========================================== */
.right-panel {
  position: fixed;
  right: 0;
  padding: var(--space-2);
  background: var(--color-background);
  height: 100%;
  bottom: 0;
  width: var(--sidebar-width);
  overflow: hidden;
  border-left: 1px solid var(--color-border);
  z-index: var(--z-raised);
}

.focus-panel {
  z-index: var(--z-popover);
}

.unsaved-changes {
  position: absolute;
  top: 60px;
  left: var(--space-2);
  padding: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-background-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  width: calc(var(--sidebar-width) - var(--space-2));
  z-index: var(--z-dropdown);
}

.changes-window {
  position: fixed;
  transform: translate(-50%, -50%);
  left: 50%;
  top: 50%;
  width: 400px;
  max-width: 90vw;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2xl);
  padding: var(--space-2) var(--space-4);
  overflow-y: auto;
  max-height: 90vh;
  z-index: var(--z-modal);
}

.small-preview {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: var(--color-background);
  box-shadow: var(--shadow-xl);
  border-top: 1px solid var(--color-border);
  z-index: var(--z-overlay);
}

/* ==========================================
   CONTEXT MENU
   ========================================== */
.context-menu {
  position: absolute;
  background: var(--color-background-elevated);
  border: 1px solid var(--color-border);
  padding: var(--space-1);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--color-text);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-dropdown);
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.context-menu a {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-fast) var(--ease-out);
}

.context-menu a:hover {
  background-color: var(--color-surface-hover);
}

/* ==========================================
   TRANSITIONS
   ========================================== */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--duration-normal) var(--ease-emphasized);
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-top-enter-active,
.slide-top-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out);
}

.slide-top-enter-from,
.slide-top-leave-to {
  opacity: 0;
}

.slide-bottom-enter-active,
.slide-bottom-leave-active {
  transition: transform var(--duration-normal) var(--ease-emphasized);
}

.slide-bottom-enter-from,
.slide-bottom-leave-to {
  transform: translateY(100%);
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform var(--duration-fast) var(--ease-emphasized);
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform var(--duration-fast) var(--ease-emphasized);
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

/* ==========================================
   RESPONSIVE - TABLET
   ========================================== */
@media (max-width: 768px) {
  .search-box,
  .right-panel {
    width: 45vw;
  }

  .search-box {
    margin-top: 0;
    left: 0;
  }

  .unsaved-changes {
    width: 45vw;
    left: 0;
    top: 48px;
  }

  .adv-search-hint {
    width: 45vw;
    left: 0;
    top: 56px;
    padding: var(--space-2);
  }

  .hint-text {
    font-size: var(--text-xs);
  }
}

/* ==========================================
   RESPONSIVE - MOBILE
   ========================================== */
@media (max-width: 640px) {
  .search-box {
    left: 0;
    margin-top: 0;
    width: 100%;
    border-radius: 0;
  }

  .right-panel {
    width: 100%;
  }

  .focus-panel {
    top: auto;
    bottom: 0;
    height: 40vh;
    max-height: 40vh;
    border-left: none;
    border-top: 1px solid var(--color-border);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    box-shadow: var(--shadow-2xl);
  }

  .unsaved-changes {
    width: calc(100% - var(--space-4));
    left: var(--space-2);
  }

  .adv-search-hint {
    width: calc(100% - var(--space-4));
    left: var(--space-2);
    top: 56px;
    padding: var(--space-2) var(--space-3);
  }

  .hint-text {
    font-size: var(--text-xs);
  }

  .hint-icon {
    width: 18px;
    height: 18px;
  }

  .made-by {
    font-size: var(--text-xs);
    padding: 4px;
  }

  .neighbors-container {
    height: 30%;
    top: 70%;
    z-index: var(--z-overlay);
    border-top: 1px solid var(--color-border);
    box-shadow: var(--shadow-xl);
  }
}
</style>
