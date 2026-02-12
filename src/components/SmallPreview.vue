<script setup lang="ts">
import { getGameInfo, type GameDetail } from '@/lib/bggClient'
import { ref, watchEffect } from 'vue'
import BaseIconButton from './base/BaseIconButton.vue'

interface Repo {
  name: string
  id: number
}

const props = defineProps<Repo>()
const gameDetail = ref<GameDetail>()
const emit = defineEmits<{
  'show-full-preview': [id: string]
  close: []
}>()

watchEffect(() => {
  getGameInfo(props.id.toString())
    .then((resp) => {
      if (resp) gameDetail.value = resp
    })
    .catch((error: unknown) => {
      console.error('Error fetching game info:', error)
    })
})

function showFullPreview() {
  emit('show-full-preview', props.name)
}

function close() {
  emit('close')
}
</script>
<template>
  <div class="preview-sheet" @click.self="close">
    <div class="preview-content" @click.prevent="showFullPreview">
      <div class="preview-header">
        <h3 class="preview-title">{{ props.name }}</h3>
        <BaseIconButton ariaLabel="Close preview" variant="ghost" size="md" @click.prevent.stop="close">
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
      <div class="preview-stats">
        <div class="stat-item">
          <div class="stat-value">
            <span v-if="gameDetail?.minPlayers !== gameDetail?.maxPlayers"> {{ gameDetail?.minPlayers }}-{{ gameDetail?.maxPlayers }} </span>
            <span v-else>{{ gameDetail?.minPlayers }}</span>
          </div>
          <div class="stat-label">Players</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">
            <span v-if="gameDetail?.minPlayTime !== gameDetail?.maxPlayTime"> {{ gameDetail?.minPlayTime }}-{{ gameDetail?.maxPlayTime }} </span>
            <span v-else>{{ gameDetail?.minPlayTime }}</span>
          </div>
          <div class="stat-label">Minutes</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ gameDetail?.minAge }}+</div>
          <div class="stat-label">Age</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ gameDetail?.weight }}/5</div>
          <div class="stat-label">Weight</div>
        </div>
      </div>
      <div class="preview-tap-hint">
        <span>Tap for details</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==========================================
   MOBILE BOTTOM SHEET PREVIEW
   ========================================== */
.preview-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-popover);
  animation: slideUp var(--duration-normal) var(--ease-out);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.preview-content {
  background: var(--color-surface);
  border-top-left-radius: var(--radius-xl);
  border-top-right-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out);
}

.preview-content:active {
  transform: scale(0.98);
}

/* Header */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  padding-bottom: var(--space-1);
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.preview-title {
  flex: 1;
  font-size: var(--text-md);
  font-weight: var(--font-bold);
  margin: 0;
  color: var(--color-heading);
  line-height: var(--leading-tight);
}

/* Close button - Link color for discoverability */
.preview-header :deep(.base-icon-button) {
  color: var(--color-link);
}

.preview-header :deep(.base-icon-button:hover:not(:disabled)) {
  color: var(--color-link-hover);
}

/* Stats Grid */
.preview-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-1);
  background: var(--color-surface-soft);
  border-radius: var(--radius-sm);
}

.stat-value {
  font-size: var(--text-md);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-1);
  line-height: var(--leading-tight);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-soft);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  font-weight: var(--font-semibold);
}

/* Tap Hint */
.preview-tap-hint {
  display: flex;
  justify-content: center;
  padding: var(--space-1) var(--space-3) var(--space-2);
  color: var(--color-text-mute);
  font-size: var(--text-xs);
  font-style: italic;
}

.preview-tap-hint::before {
  content: '👆 ';
  margin-right: var(--space-1);
}

/* ==========================================
   RESPONSIVE - MOBILE SMALL
   ========================================== */
@media (max-width: 360px) {
  .preview-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-1);
  }

  .stat-value {
    font-size: var(--text-sm);
  }

  .stat-label {
    font-size: 9px;
  }
}

/* ==========================================
   RESPONSIVE - TABLET+
   Hide on larger screens (desktop uses full sidebar)
   ========================================== */
@media (min-width: 768px) {
  .preview-sheet {
    display: none;
  }
}
</style>
