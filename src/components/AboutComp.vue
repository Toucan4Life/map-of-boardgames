<script setup lang="ts">
import BaseIconButton from './base/BaseIconButton.vue'

const emit = defineEmits<{ close: [] }>()

const isOpen = defineModel<boolean>('isOpen', { default: false })

function close(): void {
  isOpen.value = false
  emit('close')
}
</script>
<template>
  <div v-if="isOpen" class="about-container">
    <div class="about-overlay" @click="close"></div>
    <div class="about-panel">
      <div class="panel-header">
        <h2 class="panel-title">Map of Boardgames</h2>
        <BaseIconButton ariaLabel="Close about panel" variant="ghost" size="md" @click="close">
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
      <div class="panel-content">
        <p class="intro-text">
          Each dot is a boardgame. Two dots within the same cluster are connected if multiple users frequently reviewed both games. The size of the
          dot indicates the number of reviews the game has received, the shape indicates the complexity, and the color indicates the user's ratings.
          The name of the clusters were guessed one by one based on the properties of the games in the cluster. They could be non-representative.
        </p>
        <p>Only games with over 10 ratings were taken into account.</p>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">40,590</div>
            <div class="stat-label">Board Games</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">55</div>
            <div class="stat-label">Regions</div>
          </div>
        </div>
        <p>
          The code for this project can be found on
          <a href="https://github.com/Toucan4Life/map-of-boardgames" class="normal" target="_blank" rel="noopener noreferrer">GitHub</a>.
        </p>

        <h3 class="section-title">Credits</h3>
        <p>A huge thanks to <strong>Anvaka</strong>, who inspired me to do this project and created the tools that enabled me to come this far.</p>
        <p class="author">
          <strong>Toucan4Life / Onixou</strong>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==========================================
   ABOUT PANEL
   ========================================== */
.about-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-popover);
  display: flex;
}

.about-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-overlay);
  backdrop-filter: blur(2px);
}

.about-panel {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  z-index: 1;
  animation: slideInLeft var(--duration-normal) var(--ease-out);
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

/* Panel Header */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  gap: var(--space-3);
}

.panel-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin: 0;
  color: var(--color-heading);
  flex: 1;
  min-width: 0;
}

.panel-header :deep(.base-icon-button) {
  flex-shrink: 0;
  color: var(--color-primary);
}

.panel-header :deep(.base-icon-button:hover) {
  background: var(--color-surface-hover);
}

/* Panel Content - Scrollable Area */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.intro-text {
  margin-bottom: var(--space-4);
  line-height: var(--leading-relaxed);
  color: var(--color-text);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin: var(--space-4) 0;
}

.stat-card {
  background: var(--color-surface-soft);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  text-align: center;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-1);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-soft);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  font-weight: var(--font-semibold);
}

.section-title {
  font-size: var(--text-md);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin: var(--space-5) 0 var(--space-3) 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

p {
  margin: 0 0 var(--space-3) 0;
  line-height: var(--leading-relaxed);
  color: var(--color-text);
}

.author {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

a.normal {
  color: var(--color-link);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-out);
}

a.normal:hover {
  color: var(--color-link-hover);
  text-decoration: underline;
}

/* ==========================================
   RESPONSIVE - MOBILE
   ========================================== */
@media (max-width: 640px) {
  .about-panel {
    max-width: 100%;
  }

  .panel-header {
    padding: var(--space-3);
  }

  .panel-content {
    padding: var(--space-3);
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
