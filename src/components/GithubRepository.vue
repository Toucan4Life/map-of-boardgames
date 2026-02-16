<script setup lang="ts">
import { getGameInfo, type GameDetail } from '@/lib/bggClient'
import { computed, ref, watchEffect } from 'vue'
import BaseCard from './base/BaseCard.vue'
import BaseChip from './base/BaseChip.vue'
import BaseButton from './base/BaseButton.vue'

interface Repo {
  name: string
  id: number
}

const gameDetail = ref<GameDetail>()
const isLoading = ref(true)
const hasError = ref(false)
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
  // Using our colorblind-safe rating scale from design tokens
  if (rating < 5.1) return 'var(--rating-1)'
  if (rating < 5.6) return 'var(--rating-2)'
  if (rating < 5.9) return 'var(--rating-3)'
  if (rating < 6.2) return 'var(--rating-4)'
  if (rating < 6.4) return 'var(--rating-5)'
  if (rating < 6.7) return 'var(--rating-6)'
  if (rating < 6.9) return 'var(--rating-7)'
  if (rating < 7.2) return 'var(--rating-8)'
  if (rating < 7.6) return 'var(--rating-9)'
  return 'var(--rating-10)'
})

watchEffect(() => {
  isLoading.value = true
  hasError.value = false

  getGameInfo(props.id.toString())
    .then((resp) => {
      if (resp) {
        gameDetail.value = resp
        hasError.value = false
      } else {
        hasError.value = true
      }
    })
    .catch((error: unknown) => {
      console.error('Error fetching game info:', error)
      hasError.value = true
    })
    .finally(() => {
      isLoading.value = false
    })
})

function retryFetch(): void {
  isLoading.value = true
  hasError.value = false

  getGameInfo(props.id.toString())
    .then((resp) => {
      if (resp) {
        gameDetail.value = resp
        hasError.value = false
      } else {
        hasError.value = true
      }
    })
    .catch((error: unknown) => {
      console.error('Error fetching game info:', error)
      hasError.value = true
    })
    .finally(() => {
      isLoading.value = false
    })
}

function listConnections(): void {
  emit('listConnections')
}
</script>

<template>
  <div class="repo-viewer">
    <!-- Loading State -->
    <div v-if="isLoading" class="state-message">
      <div class="loading-spinner"></div>
      <p>Loading game details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="hasError" class="state-message error-state">
      <div class="error-icon">⚠️</div>
      <h3>Unable to Load Game Details</h3>
      <p>The BoardGameGeek server might be busy or experiencing issues. Please try again.</p>
      <BaseButton variant="primary" size="md" @click="retryFetch()"> Retry </BaseButton>
      <div class="game-id-fallback">
        <a :href="repoLink" target="_blank">View on BoardGameGeek</a>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="game-container">
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
            <div class="stat-meta" v-if="gameDetail?.recommendedPlayers">Rec: {{ gameDetail?.recommendedPlayers }}</div>
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
        <BaseButton variant="secondary" size="md" fullWidth @click="listConnections()"> List connections </BaseButton>
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
            <h4 class="tag-group-label">Categories</h4>
            <div class="tag-list">
              <BaseChip v-for="category in gameDetail.categories" :key="category" variant="primary" size="sm">{{ category }}</BaseChip>
            </div>
          </div>

          <div v-if="gameDetail?.mechanics?.length" class="tag-group">
            <h4 class="tag-group-label">Mechanics</h4>
            <div class="tag-list">
              <BaseChip v-for="mechanic in gameDetail.mechanics" :key="mechanic" variant="accent" size="sm">{{ mechanic }}</BaseChip>
            </div>
          </div>

          <div v-if="gameDetail?.families?.length && gameDetail.families.filter((f) => !f.includes('Admin:')).length > 0" class="tag-group">
            <h4 class="tag-group-label">Families</h4>
            <div class="tag-list">
              <BaseChip v-for="family in gameDetail.families.filter((f) => !f.includes('Admin:'))" :key="family" variant="success" size="sm">{{
                family
              }}</BaseChip>
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
/* ==========================================
   GAME DETAILS PANEL
   ========================================== */
.repo-viewer {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--color-background);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  z-index: var(--z-overlay);
  padding: calc(var(--header-height) + var(--space-2)) var(--space-3) var(--space-4);
}

/* ==========================================
   LOADING & ERROR STATES
   ========================================== */
.state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
  text-align: center;
  min-height: 300px;
}

.state-message p {
  color: var(--color-text-soft);
  margin: var(--space-2) 0;
  font-size: var(--text-sm);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-3);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  gap: var(--space-3);
}

.error-state h3 {
  color: var(--color-heading);
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
}

.error-icon {
  font-size: 48px;
  margin-bottom: var(--space-2);
}

.game-id-fallback {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
}

.game-id-fallback a {
  color: var(--color-link);
  text-decoration: none;
}

.game-id-fallback a:hover {
  color: var(--color-link-hover);
  text-decoration: underline;
}

.game-container {
  max-width: 100%;
}

/* ==========================================
   HEADER SECTION
   ========================================== */
.game-header {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border-strong);
}

.game-image-wrapper {
  flex-shrink: 0;
  width: 120px;
}

.game-image {
  width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.game-header-content {
  flex: 1;
  min-width: 0;
}

.game-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin: 0 0 var(--space-1) 0;
  line-height: var(--leading-tight);
  color: var(--color-heading);
}

.game-title a {
  color: var(--color-link);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-out);
}

.game-title a:hover {
  color: var(--color-link-hover);
  text-decoration: underline;
}

.game-year {
  font-size: var(--text-sm);
  color: var(--color-text-soft);
  margin-bottom: var(--space-2);
}

.game-stats-badges {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  flex-wrap: wrap;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.rating-badge {
  font-weight: var(--font-bold);
}

.badge-icon {
  flex-shrink: 0;
  pointer-events: none;
}

.badge-text {
  font-size: var(--text-md);
  font-weight: var(--font-bold);
}

.ratings-count {
  padding: var(--space-1) var(--space-2);
}

.ratings-text {
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

.game-description {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ==========================================
   GAMEPLAY STATS GRID
   ========================================== */
.gameplay-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.gameplay-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3) var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: center;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.stat-value {
  font-size: var(--text-md);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-1);
}

.stat-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-text-soft);
  font-weight: var(--font-semibold);
}

.stat-meta {
  font-size: var(--text-xs);
  color: var(--color-text-mute);
  margin-top: var(--space-1);
}

/* ==========================================
   ACTIONS
   ========================================== */
.actions {
  margin-bottom: var(--space-4);
}

/* ==========================================
   GAME DETAILS SECTION
   ========================================== */
.game-details {
  margin-top: var(--space-3);
}

/* Info Grid */
.info-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.info-item {
  display: flex;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

.info-label {
  font-weight: var(--font-semibold);
  min-width: 90px;
  flex-shrink: 0;
  color: var(--color-text-soft);
}

.info-value {
  flex: 1;
  color: var(--color-text);
}

.more-count {
  font-style: italic;
  color: var(--color-text-mute);
  font-size: var(--text-xs);
}

/* ==========================================
   TAGS SECTION
   ========================================== */
.tags-section {
  margin-bottom: var(--space-4);
}

.tag-group {
  margin-bottom: var(--space-4);
}

.tag-group:last-child {
  margin-bottom: 0;
}

.tag-group-label {
  display: block;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  margin: 0 0 var(--space-2) 0;
  color: var(--color-text-soft);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* ==========================================
   EXPANSIONS SECTION
   ========================================== */
.expansions-section {
  margin-bottom: var(--space-3);
}

.section-title {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  margin: 0 0 var(--space-2) 0;
  color: var(--color-text-soft);
}

.expansion-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.expansion-item {
  font-size: var(--text-sm);
  padding: var(--space-1) 0;
  color: var(--color-link);
  line-height: var(--leading-relaxed);
  text-decoration: none;
  display: block;
  transition: color var(--duration-fast) var(--ease-out);
}

.expansion-item:hover {
  color: var(--color-link-hover);
  text-decoration: underline;
}

.expansion-item::before {
  content: '• ';
  color: var(--color-text-mute);
  margin-right: var(--space-2);
}

/* ==========================================
   RESPONSIVE - MOBILE
   ========================================== */
@media (max-width: 640px) {
  .repo-viewer {
    width: 100%;
    max-width: 100%;
    padding: calc(var(--header-height-mobile) + var(--space-2)) var(--space-2) var(--space-3);
  }

  .game-header {
    flex-direction: column;
    gap: var(--space-3);
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

  .game-title {
    font-size: var(--text-lg);
  }
}

/* ==========================================
   RESPONSIVE - DESKTOP
   ========================================== */
@media (min-width: 1024px) {
  .repo-viewer {
    padding: calc(var(--header-height) + var(--space-2)) var(--space-4) var(--space-6);
  }

  .game-image-wrapper {
    width: 150px;
  }

  .game-title {
    font-size: var(--text-2xl);
  }

  .stat-value {
    font-size: var(--text-lg);
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
