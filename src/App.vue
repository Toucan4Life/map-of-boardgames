<script setup lang="ts">
import { ref, onBeforeUnmount, onBeforeMount, computed, reactive } from 'vue'
import TypeAhead from './components/Type-Ahead.vue'
import GithubRepository from './components/GithubRepository.vue'
import SmallPreview from './components/SmallPreview.vue'
import About from './components/AboutComp.vue'
import advSearch from './components/AdvSearch.vue'
import UnsavedChanges from './components/UnsavedChanges.vue'
import LargestRepositories from './components/LargestRepositories.vue'
import FocusRepository from './components/FocusRepository.vue'
import GroupViewModel from './lib/GroupViewModel'
import { FocusViewModel, type Repositories } from './lib/FocusViewModel'
import bus from './lib/bus'
import type { SearchResult } from './lib/createFuzzySearcher'
import type { AdvSearchResult } from './components/AdvSearch.vue'

const SM_SCREEN_BREAKPOINT = 600

// UI state
const sidebarVisible = ref(false)
const aboutVisible = ref(false)
const advSearchVisible = ref(false)
const unsavedChangesVisible = ref(false)
const hasUnsavedChanges = ref(false)
const isSmallScreen = ref(window.innerWidth < SM_SCREEN_BREAKPOINT)

// Project state
const defaultProjectState = {
  current: '',
  currentId: null as number | null,
  smallPreviewName: '',
}
const project = reactive({ ...defaultProjectState })

// View models
const currentGroup = ref<GroupViewModel>()
const currentFocus = ref<FocusViewModel>()

// Overlays
const tooltip = ref<{ left: string; top: string; background: string; text: string }>()
const contextMenu = ref<{
  click: () => void
  left: string
  top: string
  items: { text: string; click: () => void }[]
}>()

// Internal state
let lastSelected: SearchResult | undefined
const groupCache = new Map<number, GroupViewModel>()

const typeAheadVisible = computed(() => !(isSmallScreen.value && currentGroup.value && !project.current))
function showFullPreview() {
  if (!lastSelected) return
  if (isSmallScreen.value) {
    Object.assign(project, {
      current: '',
      currentId: lastSelected.id,
      smallPreviewName: lastSelected.text,
    })
  } else {
    Object.assign(project, {
      current: lastSelected.text,
      currentId: lastSelected.id,
      smallPreviewName: '',
    })
  }
}

function clearProjectState() {
  sidebarVisible.value = false
  Object.assign(project, defaultProjectState)
  window.mapOwner.clearHighlights()
}

function getOrCreateGroupViewModel(groupId: number) {
  if (!groupCache.has(groupId)) groupCache.set(groupId, new GroupViewModel())
  return groupCache.get(groupId)!
}

function findProject(repo: SearchResult) {
  console.log('repo:', repo)
  console.log('lastSelected:', lastSelected)
  lastSelected = lastSelected?.text === repo.text ? lastSelected : repo
  console.log('lastSelected:', lastSelected)
  window.mapOwner.makeVisible(lastSelected.text, { center: [lastSelected.lat, lastSelected.lon], zoom: 12 }, lastSelected.skipAnimation)
  // console.log('Selected project:', project)
  console.log('lastSelected.id:', lastSelected.id)
  Object.assign(project, { current: lastSelected.text, currentId: lastSelected.id })
  console.log({ ...project }) //Print Proxy.target.currentId = undefined
  console.log('lastSelected.id:', lastSelected.id) // Print 64204
  console.log('project.id:', project.currentId) // Print 64204
  console.log({ ...project }) //Print Proxy.target.currentId = undefined
  bus.fire('current-project', lastSelected.text)
}

async function listCurrentConnections() {
  if (!lastSelected) {
    console.warn('No last selected repository to list connections for.')
    return
  }
  currentFocus.value?.disposeSubgraphViewer()
  contextMenu.value = undefined

  const groupId = lastSelected.groupId ?? (await window.mapOwner.getGroupIdAt(lastSelected.lat, lastSelected.lon))

  if (groupId !== undefined) {
    currentGroup.value = undefined
    currentFocus.value = new FocusViewModel(lastSelected.id, groupId, lastSelected.text)
  }
}

function search(params: AdvSearchResult) {
  window.mapOwner.highlightNode({
    minWeight: params.minWeight ?? 0,
    maxWeight: params.maxWeight ?? 10,
    minRating: params.minRating ?? 0,
    maxRating: params.maxRating ?? 10,
    minPlaytime: params.minPlaytime ?? 0,
    maxPlaytime: params.maxPlaytime ?? 1000,
    playerChoice: params.playerChoice ?? 0,
    minPlayers: params.minPlayers ?? 1,
    maxPlayers: params.maxPlayers ?? 20,
    minYear: params.minYear ?? 1900,
    maxYear: params.maxYear ?? new Date().getFullYear(),
  })
}

const resizeHandler = () => {
  isSmallScreen.value = window.innerWidth < SM_SCREEN_BREAKPOINT
}

// Keep handler references for cleanup
const repoSelectedHandler = (repo: SearchResult, fullView = false) => {
  console.log('repo in handler:', repo)
  lastSelected = repo
  if (isSmallScreen.value && !fullView) {
    Object.assign(project, {
      current: '',
      currentId: repo.id,
      smallPreviewName: repo.text,
    })
  } else {
    Object.assign(project, {
      current: repo.text,
      currentId: repo.id,
      smallPreviewName: '',
    })
  }
}

const showLargestHandler = (id: number, largest: Repositories[]) => {
  const g = getOrCreateGroupViewModel(id)
  g.setLargest(largest)
  currentFocus.value = undefined
  currentGroup.value = g
}

const focusOnRepoHandler = (repo: number, groupId: number, label: string) => {
  currentGroup.value = undefined
  currentFocus.value = new FocusViewModel(repo, groupId, label)
}

onBeforeMount(() => {
  bus.on('repo-selected', repoSelectedHandler)
  bus.on('show-context-menu', (m) => (contextMenu.value = m))
  bus.on('show-tooltip', (t) => (tooltip.value = t))
  bus.on('show-largest-in-group', showLargestHandler)
  bus.on('focus-on-repo', focusOnRepoHandler)
  bus.on('unsaved-changes-detected', (has) => (hasUnsavedChanges.value = has))

  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  window.mapOwner.dispose()
  bus.off('repo-selected', repoSelectedHandler)
  bus.off('show-largest-in-group', showLargestHandler)
  bus.off('focus-on-repo', focusOnRepoHandler)
  window.removeEventListener('resize', resizeHandler)
})
function closeGroupView() {
  currentGroup.value = undefined
  window.mapOwner.clearBorderHighlights()
}

function closeFocusView() {
  currentFocus.value = undefined
}

function handleItem(item: { text: string; click: () => void }) {
  contextMenu.value = undefined
  item.click()
}
</script>

<template>
  <div>
    <!-- Unsaved changes banner -->
    <div v-if="hasUnsavedChanges" class="unsaved-changes">
      You have unsaved labels in local storage.
      <a href="#" class="normal" @click.prevent="unsavedChangesVisible = true">Click here</a>
      to see them.
    </div>

    <!-- Made by -->
    <div class="made-by">
      Made by
      <a class="normal" aria-label="Made by Toucan4Life, inspired by @anvaka" target="_blank" href="https://github.com/Toucan4Life">Toucan4Life</a>,
      inspired by
      <a class="normal" aria-label="Inspired by @anvaka" target="_blank" href="https://github.com/Anvaka">Anvaka</a>
    </div>

    <!-- Right panel views -->
    <largest-repositories v-if="currentGroup" :repos="currentGroup" class="right-panel" @selected="findProject" @close="closeGroupView" />

    <focus-repository v-if="currentFocus" :vm="currentFocus" class="right-panel" @selected="findProject" @close="closeFocusView" />

    <!-- Full repository view -->
    <github-repository
      v-if="project.current && project.currentId"
      :id="project.currentId"
      :name="project.current"
      @list-connections="listCurrentConnections"
    />

    <!-- Search bar -->
    <form v-if="typeAheadVisible" class="search-box" @submit.prevent>
      <type-ahead
        placeholder="Find Game"
        :show-clear-button="project.current ? 'true' : 'false'"
        :query="project.current"
        @menu-clicked="aboutVisible = true"
        @show-advanced-search="advSearchVisible = true"
        @selected="findProject"
        @before-clear="clearProjectState"
        @cleared="clearProjectState"
      />
    </form>

    <!-- Small preview -->
    <transition name="slide-bottom">
      <small-preview
        v-if="project.smallPreviewName && project.currentId"
        :id="project.currentId"
        :name="project.smallPreviewName"
        class="small-preview"
        @show-full-preview="showFullPreview"
      />
    </transition>

    <!-- Tooltip -->
    <div v-if="tooltip" class="tooltip" :style="{ left: tooltip.left, top: tooltip.top, background: tooltip.background }">
      {{ tooltip.text }}
    </div>

    <!-- Context menu -->
    <div v-if="contextMenu" class="context-menu" :style="{ left: contextMenu.left, top: contextMenu.top }">
      <a v-for="(item, key) in contextMenu.items" :key="key" href="#" @click.prevent="handleItem(item)">
        {{ item.text }}
      </a>
    </div>

    <!-- Slide-in overlays -->
    <transition name="slide-top">
      <unsaved-changes v-if="unsavedChangesVisible" class="changes-window" @close="unsavedChangesVisible = false" />
    </transition>
    <transition name="slide-left">
      <about v-if="aboutVisible" class="about" @close="aboutVisible = false" />
    </transition>
    <transition name="slide-right">
      <advSearch v-if="advSearchVisible" class="adv-search" @search="search" @close="advSearchVisible = false" />
    </transition>
  </div>
</template>

<style scoped>
.made-by {
  position: fixed;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  font-size: 12px;
  color: #fff;
}

.made-by a {
  color: hsla(160, 100%, 37%, 1);
}

.search-box {
  position: absolute;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.2),
    0 -1px 0px rgba(0, 0, 0, 0.02);
  height: 48px;
  font-size: 16px;
  margin-top: 16px;
  padding: 0;
  cursor: text;
  left: 8px;
  width: calc(var(--side-panel-width) - 8px);
}

.tooltip {
  position: absolute;
  background: var(--color-background-soft);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--color-text);
  z-index: 1;
  pointer-events: none;
  white-space: nowrap;
  transform: translate(-50%, calc(-100% - 12px));
}

.right-panel {
  position: fixed;
  right: 0;
  padding: 8px;
  background: var(--color-background);
  height: 100%;
  bottom: 0;
  width: 400px;
  overflow: hidden;
  border-left: 1px solid var(--color-border);
}

.unsaved-changes {
  position: absolute;
  top: 60px;
  left: 8px;
  padding: 8px;
  font-size: 12px;
  color: var(--color-text);
  background: var(--color-background);
  width: calc(var(--side-panel-width) - 8px);
}

.slide-top-enter-active,
.slide-top-leave-active {
  transition: opacity 0.3s cubic-bezier(0, 0, 0.58, 1);
}

.slide-top-enter,
.slide-top-leave-to {
  opacity: 0;
}

.changes-window {
  position: fixed;
  transform: translate(-50%, -50%);
  top: 0;
  left: 50%;
  top: 50%;
  width: 400px;
  background: var(--color-background);
  z-index: 2;
  box-shadow: 0 -1px 24px rgb(0 0 0);
  padding: 8px 16px;
  overflow-y: auto;
  max-height: 100%;
}

.context-menu {
  position: absolute;
  background: var(--color-background-soft);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--color-text);
  z-index: 2;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
}

.repo-viewer {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(var(--side-panel-width) + 16px);
  height: 100vh;
  overflow: auto;
  background: var(--color-background);
  border-right: 1px solid var(--color-border);
}

.slide-bottom-enter-active,
.slide-bottom-leave-active {
  transition: transform 0.3s cubic-bezier(0, 0, 0.58, 1);
}

.slide-bottom-enter,
.slide-bottom-leave-to {
  transform: translateY(84px);
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 150ms cubic-bezier(0, 0, 0.58, 1);
}

.slide-left-enter,
.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 150ms cubic-bezier(0, 0, 0.58, 1);
}

.slide-right-enter,
.slide-right-leave-to {
  transform: translateX(100%);
}

.small-preview {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 84px;
  background: var(--color-background);
  box-shadow: 0 -4px 4px rgba(0, 0, 0, 0.42);
}

.about {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--side-panel-width);
  background: var(--color-background);
  z-index: 2;
  box-shadow: 0 -1px 24px rgb(0 0 0);
  display: flex;
  flex-direction: column;
  max-width: 90%;
}

.adv-search {
  position: fixed;
  top: 0;
  right: 0;
  width: var(--side-panel-width);
  background: var(--color-background);
  z-index: 2;
  box-shadow: 0 -1px 24px rgb(0 0 0);
  display: flex;
  flex-direction: column;
  max-width: 100%;
}

@media (max-width: 800px) {
  .repo-viewer,
  .search-box,
  .right-panel {
    width: 45vw;
  }

  .search-box {
    margin: 0;
    left: 0;
  }

  .unsaved-changes {
    width: 45vw;
    left: 0;
    top: 48px;
  }
}

@media (max-width: 600px) {
  .repo-viewer {
    width: 100%;
  }

  .search-box {
    left: 0;
    margin-top: 0;
    width: 100%;
  }

  .right-panel {
    width: 100%;
  }

  .neighbors-container {
    height: 30%;
    top: 70%;
    z-index: 2;
    border-top: 1px solid var(--color-border);
    box-shadow: 0 -4px 4px rgba(0, 0, 0, 0.42);
  }
}
</style>
