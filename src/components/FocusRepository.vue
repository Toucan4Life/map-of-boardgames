<script setup lang="ts">
import type { SearchResult } from '@/lib/createFuzzySearcher'
import type { IFocusViewModel, Repositories } from '@/lib/FocusViewModel'
import TreeView from './TreeView.vue'
import type { BoardGameNodeData } from '@/lib/fetchAndProcessGraph'
import BaseIconButton from './base/BaseIconButton.vue'
import BaseButton from './base/BaseButton.vue'
import BaseCard from './base/BaseCard.vue'

const props = defineProps<{ vm: IFocusViewModel }>()

const emit = defineEmits<{
  selected: [id: SearchResult]
  close: []
  cleared: []
  repoSelected: [id: SearchResult]
}>()

function handleNodeSelected(node: BoardGameNodeData, event: MouseEvent) {
  showDetails(
    {
      name: node.label,
      lngLat: node.lnglat,
      id: node.id || 0,
      isExternal: false,
      linkWeight: 0,
      groupId: node.c,
    },
    event,
  )
}

function showDetails(repo: IFocusViewModel | Repositories, event: MouseEvent): void {
  if (!repo.id) return
  emit('selected', {
    text: repo.name?.toString() ?? '',
    lon: repo.lngLat[0],
    lat: repo.lngLat[1],
    skipAnimation: event.altKey,
    id: repo.id,
    selected: false,
    html: null,
    year: '0',
    groupId: repo.groupId || 0,
  })
}
function closePanel(): void {
  props.vm.goBackToDirectConnections()
  emit('close')
}

function getLink(repo: IFocusViewModel | Repositories): string {
  if (!repo.id) {
    console.error('No ID found for the repository.' + JSON.stringify(repo))
    return ''
  }
  return 'https://boardgamegeek.com/boardgame/' + repo.id.toString()
}
function expandGraph() {
  emit('cleared')
  props.vm.expandGraph((searchResult) => {
    emit('repoSelected', searchResult)
  })
}
</script>
<template>
  <div class="focus-container">
    <div class="focus-header">
      <div class="header-content">
        <h2 class="focus-title">
          <a :href="getLink(props.vm)" class="title-link" @click.prevent="showDetails(props.vm, $event)">
            {{ props.vm.name }}
          </a>
        </h2>

        <!-- Graph view status -->
        <div v-if="vm.graphData" class="status-info">
          <span class="status-text">Graph view active</span>
          <BaseButton variant="ghost" size="sm" :disabled="vm.expandingGraph" @click="vm.goBackToDirectConnections()"> Exit </BaseButton>
        </div>

        <!-- Layout controls -->
        <div v-if="vm.graphData" class="status-info">
          <span v-if="vm.layoutRunning" class="status-text">
            Layout running
            <BaseButton variant="ghost" size="sm" @click="vm.setLayout(false)">Stop</BaseButton>
          </span>
          <span v-else class="status-text">
            Layout stopped
            <BaseButton variant="ghost" size="sm" @click="vm.setLayout(true)">Resume</BaseButton>
          </span>
        </div>

        <!-- Direct connections view -->
        <div v-else class="status-info">
          <span v-if="!vm.loading" class="status-text">
            {{ vm.repos.length }} direct connections
            <BaseButton v-if="!vm.expandingGraph" variant="ghost" size="sm" @click="expandGraph()"> Expand to graph view </BaseButton>
          </span>
        </div>
      </div>

      <BaseIconButton ariaLabel="Close focus view" variant="ghost" size="md" @click="closePanel">
        <!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </BaseIconButton>
    </div>

    <!-- Content Area -->
    <div class="focus-content">
      <!-- Regular repo list -->
      <div v-if="!vm.graphData" class="list-view">
        <ul v-if="vm.repos && !vm.expandingGraph" class="game-list">
          <li v-for="repo in vm.repos" :key="repo.name" class="game-list-item">
            <BaseCard elevation="sm" interactive>
              <a :href="getLink(repo)" class="game-link" @click.prevent="showDetails(repo, $event)">
                {{ repo.name }}
                <span v-if="repo.isExternal" class="external-badge" title="External region">E</span>
              </a>
            </BaseCard>
          </li>
        </ul>

        <!-- Loading state -->
        <div v-if="vm.expandingGraph" class="loading-container">
          <div class="loading-logs">
            <div class="log-header">Loading expanded graph view...</div>
            <div v-if="vm.currentLog" class="current-log">{{ vm.currentLog }}</div>
            <div v-if="vm.logMessages.length > 0" class="log-messages">
              <div v-for="(log, index) in vm.logMessages" :key="index" class="log-message">
                {{ log }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tree view for expanded graph -->
      <div v-else class="tree-view">
        <TreeView :tree="vm.graphData" @node-selected="handleNodeSelected" />
      </div>
    </div>
  </div>
</template>
<style scoped>
/* ==========================================
   FOCUS VIEW CONTAINER
   ========================================== */
.focus-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* Header */
.focus-header {
  position: sticky;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
  flex-shrink: 0;
  gap: var(--space-2);
  z-index: var(--z-sticky);
}

.header-content {
  flex: 1;
  min-width: 0;
}

.focus-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin: 0 0 var(--space-2) 0;
  color: var(--color-heading);
  line-height: var(--leading-tight);
}

.title-link {
  color: var(--color-link);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-out);
}

.title-link:hover {
  color: var(--color-link-hover);
  text-decoration: underline;
}

/* Status Info */
.status-info {
  font-size: var(--text-sm);
  color: var(--color-text-soft);
  margin-bottom: var(--space-1);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.status-text {
  line-height: var(--leading-relaxed);
}

/* Content Area */
.focus-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-view,
.tree-view {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
}

/* Game List */
.game-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.game-list-item {
  transition: transform var(--duration-fast) var(--ease-out);
}

.game-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  text-decoration: none;
  color: var(--color-heading);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: color var(--duration-fast) var(--ease-out);
}

.game-link:hover {
  color: var(--color-link-hover);
}

.external-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: var(--color-warning);
  background: var(--color-warning-soft);
  border-radius: var(--radius-full);
  flex-shrink: 0;
  margin-left: var(--space-2);
}

/* Loading State */
.loading-container {
  height: 100%;
  overflow-y: auto;
}

.loading-logs {
  font-family: monospace;
  font-size: var(--text-xs);
  background: var(--color-surface-soft);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  height: 100%;
  overflow: auto;
}

.log-header {
  font-weight: var(--font-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
}

.current-log {
  color: var(--color-link-hover);
  margin-bottom: var(--space-2);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: var(--leading-relaxed);
}

.log-messages {
  color: var(--color-text-soft);
  max-height: 300px;
  overflow-y: auto;
}

.log-message {
  margin-bottom: var(--space-1);
  white-space: pre-wrap;
  word-break: break-all;
  opacity: 0.8;
}

/* ==========================================
   RESPONSIVE - MOBILE
   ========================================== */
@media (max-width: 640px) {
  .focus-container {
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }

  .focus-header {
    padding: var(--space-2);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }

  .focus-title {
    font-size: var(--text-md);
  }

  .list-view,
  .tree-view {
    padding: var(--space-2);
  }

  .loading-logs {
    padding: var(--space-2);
  }

  .log-header {
    font-size: var(--text-xs);
    margin-bottom: var(--space-1);
  }

  /* Hide detailed log messages on mobile for performance */
  .log-messages {
    display: none;
  }

  .current-log {
    margin-bottom: 0;
    font-size: var(--text-xs);
  }
}
</style>
