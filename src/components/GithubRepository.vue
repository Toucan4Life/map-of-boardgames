<script setup lang="ts">
import { getGameInfo, type GameDetail } from '@/lib/bggClient'
import { computed, ref, watchEffect } from 'vue'

interface Repo {
  name: string
  id: number
}

const gameDetail = ref<GameDetail>()
const props = defineProps<Repo>()

const emit = defineEmits<{ listConnections: [] }>()
const repoLink = computed(() => {
  return `https://boardgamegeek.com/boardgame/` + props.id.toString()
})

const shapeImage = computed(() => {
  const weight = Number(gameDetail.value?.weight ?? 0)
  if (weight < 2) return 'circle'
  if (weight < 3) return 'triangle'
  if (weight < 4) return 'diamond'
  return 'star'
})

const ratingColor = computed(() => {
  const rating = Number(gameDetail.value?.rating ?? 0)
  if (rating < 5.1) return '#ff0000'
  if (rating < 5.6) return '#ff4400'
  if (rating < 5.9) return '#ff8800'
  if (rating < 6.2) return '#ffcc00'
  if (rating < 6.4) return '#ffff00'
  if (rating < 6.7) return '#ccff00'
  if (rating < 6.9) return '#88ff00'
  if (rating < 7.2) return '#00ff88'
  if (rating < 7.6) return '#00ffee'
  return '#00aaff'
})

watchEffect(() => {
  getGameInfo(props.id.toString())
    .then((resp) => {
      if (resp) gameDetail.value = resp
    })
    .catch((error: unknown) => {
      console.error('Error fetching game info:', error)
    })
})

function listConnections(): void {
  emit('listConnections')
}
</script>

<template>
  <div class="repo-viewer">
    <div class="game-container">
      <!-- Compact Header with Image and Info Side by Side -->
      <div class="game-header">
        <div class="game-image-wrapper">
          <img class="game-image" :src="gameDetail?.imageUrl" alt="" />
        </div>

        <div class="game-header-content">
          <h2 class="game-title">
            <a :href="repoLink" target="_blank">{{ name }}</a>
          </h2>
          <div class="game-year">{{ gameDetail?.yearPublished }}</div>

          <!-- Rating Badge -->
          <div class="game-stats-badges">
            <div class="stat-badge rating-badge">
              <svg class="badge-icon" width="24" height="24" viewBox="0 0 24 24">
                <circle v-if="shapeImage === 'circle'" cx="12" cy="12" r="10" :fill="ratingColor" />
                <polygon v-if="shapeImage === 'triangle'" points="12,2 22,20 2,20" :fill="ratingColor" />
                <polygon v-if="shapeImage === 'diamond'" points="12,2 22,12 12,22 2,12" :fill="ratingColor" />
                <polygon v-if="shapeImage === 'star'" points="12,2 14,9 22,9 16,13 18,21 12,16 6,21 8,13 2,9 10,9" :fill="ratingColor" />
              </svg>
              <span class="badge-text">{{ gameDetail?.rating }}</span>
            </div>
            <div v-if="gameDetail?.usersRated" class="stat-badge ratings-count">
              <span class="ratings-text">{{ gameDetail.usersRated.toLocaleString() }} ratings</span>
            </div>
          </div>

          <p class="game-description">{{ gameDetail?.description }}</p>
        </div>
      </div>

      <!-- Compact Gameplay Info -->
      <div class="gameplay-grid">
        <div class="gameplay-stat">
          <div class="stat-content">
            <div class="stat-value" v-if="gameDetail?.minPlayers != gameDetail?.maxPlayers">
              {{ gameDetail?.minPlayers }}-{{ gameDetail?.maxPlayers }}
            </div>
            <div class="stat-value" v-else>{{ gameDetail?.minPlayers }}</div>
            <div class="stat-label">Players</div>
            <div class="stat-meta" v-if="gameDetail?.bestPlayers">Best: {{ gameDetail?.bestPlayers }}</div>
          </div>
        </div>

        <div class="gameplay-stat">
          <div class="stat-content">
            <div class="stat-value" v-if="gameDetail?.minPlayTime != gameDetail?.maxPlayTime">
              {{ gameDetail?.minPlayTime }}-{{ gameDetail?.maxPlayTime }}
            </div>
            <div class="stat-value" v-else>{{ gameDetail?.minPlayTime }}</div>
            <div class="stat-label">Minutes</div>
          </div>
        </div>

        <div class="gameplay-stat">
          <div class="stat-content">
            <div class="stat-value">{{ gameDetail?.minAge }}+</div>
            <div class="stat-label">Age</div>
            <div class="stat-meta" v-if="gameDetail?.recommendedAge">Rec: {{ gameDetail?.recommendedAge }}+</div>
          </div>
        </div>

        <div class="gameplay-stat">
          <div class="stat-content">
            <div class="stat-value">{{ gameDetail?.weight }}</div>
            <div class="stat-label">Complexity</div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <a href="#" @click.prevent="listConnections()" class="action-link">List connections</a>
      </div>

      <!-- Game Details Section -->
      <div class="game-details">
        <!-- Credits & Stats -->
        <div class="info-grid">
          <div v-if="gameDetail?.designers?.length" class="info-item">
            <span class="info-label">Designer:</span>
            <span class="info-value">
              {{ gameDetail.designers.slice(0, 3).join(', ') }}
              <span v-if="gameDetail.designers.length > 3" class="more-count"> +{{ gameDetail.designers.length - 3 }} more</span>
            </span>
          </div>
          <div v-if="gameDetail?.artists?.length" class="info-item">
            <span class="info-label">Artist:</span>
            <span class="info-value">
              {{ gameDetail.artists.slice(0, 3).join(', ') }}
              <span v-if="gameDetail.artists.length > 3" class="more-count"> +{{ gameDetail.artists.length - 3 }} more</span>
            </span>
          </div>
          <div v-if="gameDetail?.publishers?.length" class="info-item">
            <span class="info-label">Publisher:</span>
            <span class="info-value">
              {{ gameDetail.publishers.slice(0, 3).join(', ') }}
              <span v-if="gameDetail.publishers.length > 3" class="more-count"> +{{ gameDetail.publishers.length - 3 }} more</span>
            </span>
          </div>
        </div>

        <!-- All Tags Grouped Together -->
        <div v-if="gameDetail?.categories?.length || gameDetail?.mechanics?.length || gameDetail?.families?.length" class="tags-section">
          <div v-if="gameDetail?.categories?.length" class="tag-group">
            <span class="tag-group-label">Categories</span>
            <div class="tag-list">
              <span v-for="category in gameDetail.categories" :key="category" class="game-tag category-tag">{{ category }}</span>
            </div>
          </div>

          <div v-if="gameDetail?.mechanics?.length" class="tag-group">
            <span class="tag-group-label">Mechanics</span>
            <div class="tag-list">
              <span v-for="mechanic in gameDetail.mechanics" :key="mechanic" class="game-tag mechanic-tag">{{ mechanic }}</span>
            </div>
          </div>

          <div v-if="gameDetail?.families?.length && gameDetail.families.filter((f) => !f.includes('Admin:')).length > 0" class="tag-group">
            <span class="tag-group-label">Families</span>
            <div class="tag-list">
              <span v-for="family in gameDetail.families.filter((f) => !f.includes('Admin:'))" :key="family" class="game-tag family-tag">{{
                family
              }}</span>
            </div>
          </div>
        </div>

        <!-- Expansions -->
        <div v-if="gameDetail?.expansions?.length" class="expansions-section">
          <h4 class="section-title">Expansions ({{ gameDetail.expansions.length }})</h4>
          <div class="expansion-list">
            <a
              v-for="expansion in gameDetail.expansions"
              :key="expansion.id"
              :href="`https://boardgamegeek.com/boardgameexpansion/${expansion.id}`"
              target="_blank"
              class="expansion-item"
              >{{ expansion.name }}</a
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.repo-viewer {
  padding-top: 70px;
  padding-left: 12px;
  padding-right: 12px;
  padding-bottom: 16px;
  max-width: 100%;
}

.game-container {
  max-width: 100%;
}

/* Header Section - Image and Info Side by Side */
.game-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--color-border);
}

.game-image-wrapper {
  flex-shrink: 0;
  width: 120px;
}

.game-image {
  width: 100%;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.game-header-content {
  flex: 1;
  min-width: 0;
}

.game-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.game-title a {
  color: var(--color-link-hover);
  text-decoration: none;
}

.game-title a:hover {
  text-decoration: underline;
}

.game-year {
  font-size: 13px;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 8px;
}

.game-stats-badges {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--color-background-mute);
  border-radius: 4px;
  font-size: 12px;
}

.rating-badge {
  font-weight: 700;
}

.badge-icon {
  flex-shrink: 0;
  pointer-events: none;
}

.badge-text {
  font-size: 14px;
  font-weight: 700;
}

.weight-badge {
  display: flex;
  gap: 4px;
}

.badge-label {
  opacity: 0.7;
  font-weight: 600;
}

.badge-value {
  font-weight: 700;
}

.ratings-count {
  padding: 4px 8px;
}

.ratings-text {
  font-size: 12px;
  opacity: 0.8;
}

.game-description {
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Gameplay Stats Grid */
.gameplay-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.gameplay-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 8px;
  background: var(--color-background-mute);
  border-radius: 6px;
  text-align: center;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 2px;
}

.stat-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text);
  opacity: 0.7;
  font-weight: 600;
}

.stat-meta {
  font-size: 9px;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 2px;
}

/* Actions */
.actions {
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 12px;
  padding: 0;
}

.action-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background: var(--color-background-mute);
  text-decoration: none;
  color: var(--color-link-hover);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.action-link:hover {
  background: var(--color-background-soft);
  text-decoration: underline;
}

/* Game Details Section */
.game-details {
  margin-top: 12px;
}

/* Info Grid */
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.info-item {
  display: flex;
  font-size: 12px;
  line-height: 1.5;
}

.info-label {
  font-weight: 600;
  min-width: 85px;
  flex-shrink: 0;
  color: var(--color-text);
  opacity: 0.8;
}

.info-value {
  flex: 1;
  color: var(--color-text);
}

.more-count {
  font-style: italic;
  opacity: 0.7;
  font-size: 11px;
}

/* Tags Section */
.tags-section {
  margin-bottom: 16px;
}

.tag-group {
  margin-bottom: 12px;
}

.tag-group-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  color: var(--color-text);
  opacity: 0.7;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.game-tag {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.3;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}

.game-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.category-tag {
  background-color: #e3f2fd;
  color: #1565c0;
}

.mechanic-tag {
  background-color: #f3e5f5;
  color: #6a1b9a;
}

.family-tag {
  background-color: #e8f5e9;
  color: #2e7d32;
}

/* Dark mode support for tags */
@media (prefers-color-scheme: dark) {
  .category-tag {
    background-color: #1a237e;
    color: #90caf9;
  }

  .mechanic-tag {
    background-color: #4a148c;
    color: #ce93d8;
  }

  .family-tag {
    background-color: #1b5e20;
    color: #a5d6a7;
  }
}

/* Expansions Section */
.expansions-section {
  margin-bottom: 12px;
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px 0;
  color: var(--color-text);
  opacity: 0.7;
}

.expansion-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.expansion-item {
  font-size: 12px;
  padding: 3px 0;
  color: var(--color-link-hover);
  opacity: 0.85;
  line-height: 1.4;
  text-decoration: none;
  display: block;
  transition: opacity 0.2s;
}

.expansion-item:hover {
  opacity: 1;
  text-decoration: underline;
}

.expansion-item::before {
  content: '• ';
  color: var(--color-text);
  opacity: 0.5;
  margin-right: 6px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .game-header {
    flex-direction: column;
  }

  .game-image-wrapper {
    width: 100%;
    max-width: 200px;
    margin: 0 auto;
  }

  .gameplay-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .game-stats-badges {
    flex-wrap: wrap;
  }
}

@media (min-width: 1024px) {
  .repo-viewer {
    padding-top: 70px;
    padding-left: 16px;
    padding-right: 16px;
    padding-bottom: 24px;
  }

  .game-image-wrapper {
    width: 150px;
  }

  .game-title {
    font-size: 24px;
  }
}
</style>

<style>
.readme-content {
  border-top: 1px solid var(--color-border);
  padding-top: 8px;
  overflow-x: hidden;
}
.readme-content a {
  color: var(--color-link-hover);
}
.readme-content p {
  margin-bottom: 16px;
  margin-top: 0;
}
.readme-content h1 {
  border-bottom: 1px solid var(--color-border);
}
.readme-content pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  border-radius: 6px;
}
.readme-content img {
  max-width: 100%;
}
</style>
