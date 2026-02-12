<script setup lang="ts">
import type { SearchResult } from '@/lib/createFuzzySearcher'
import type { Repositories } from '@/lib/FocusViewModel'
import type GroupViewModel from '@/lib/GroupViewModel'
import BaseIconButton from './base/BaseIconButton.vue'
import BaseCard from './base/BaseCard.vue'

const props = defineProps<{ repos: GroupViewModel }>()
const emit = defineEmits<{
  selected: [id: SearchResult]
  close: []
}>()

function showDetails(repo: Repositories): void {
  emit('selected', {
    text: repo.name?.toString() ?? '',
    lon: repo.lngLat[0],
    lat: repo.lngLat[1],
    id: repo.id,
    selected: false,
    skipAnimation: false,
    html: null,
    year: '0',
    groupId: 0,
  })
}
function closePanel(): void {
  emit('close')
}

function getLink(repo: Repositories): string {
  if (!repo.id) {
    console.error('No ID found for the repository.')
    return ''
  }
  return 'https://boardgamegeek.com/boardgame/' + repo.id.toString()
}
</script>
<template>
  <div class="group-view-container">
    <div class="group-header">
      <h2 class="group-title">In this region</h2>
      <BaseIconButton ariaLabel="Close region view" variant="ghost" size="md" @click="closePanel">
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
    <div class="group-content">
      <ul v-if="props.repos.largest.length" class="game-list">
        <li v-for="repo in props.repos.largest" :key="repo.name" class="game-list-item">
          <BaseCard elevation="sm" interactive>
            <a :href="getLink(repo)" class="game-link" @click.prevent="showDetails(repo)">
              {{ repo.name }}
            </a>
          </BaseCard>
        </li>
      </ul>
      <div v-else class="empty-state">
        <p>No games found. Try zooming in?</p>
      </div>
    </div>
  </div>
</template>
<style scoped>
/* ==========================================
   GROUP/REGION VIEW
   ========================================== */
.group-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* Header */
.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.group-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin: 0;
  color: var(--color-heading);
}

/* Content - Scrollable List */
.group-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
}

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
  display: block;
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

/* Empty State */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: var(--space-6);
}

.empty-state p {
  font-size: var(--text-sm);
  color: var(--color-text-soft);
  text-align: center;
  margin: 0;
}

/* ==========================================
   RESPONSIVE - MOBILE
   ========================================== */
@media (max-width: 640px) {
  .group-header {
    padding: var(--space-2);
  }

  .group-title {
    font-size: var(--text-md);
  }

  .group-content {
    padding: var(--space-2);
  }
}
</style>
