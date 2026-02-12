<template>
  <BaseCard :class="['legend-card', { 'legend-card--collapsed': !isExpanded }]" elevation="lg" @click="isExpanded = !isExpanded">
    <!-- Toggle Button -->
    <button class="legend-card__toggle" :aria-expanded="isExpanded" aria-label="Toggle legend visibility">
      <span class="legend-card__toggle-text">Legend</span>
      <span class="legend-card__toggle-icon">{{ isExpanded ? '▲' : '▼' }}</span>
    </button>

    <!-- Legend Content -->
    <div v-show="isExpanded" class="legend-card__content">
      <!-- Rating Section -->
      <section class="legend-section" aria-labelledby="rating-legend">
        <h3 id="rating-legend" class="legend-section__title">Rating</h3>
        <p class="legend-section__description">BGG average user rating (1-10 scale)</p>
        <div class="legend-bar" role="img" aria-label="Rating color scale from poor (red) to excellent (blue)">
          <div class="legend-bar__segment" style="background-color: var(--rating-1)" title="Poor: <5.1"></div>
          <div class="legend-bar__segment" style="background-color: var(--rating-2)" title="5.1-<5.6"></div>
          <div class="legend-bar__segment" style="background-color: var(--rating-3)" title="5.6-<5.9"></div>
          <div class="legend-bar__segment" style="background-color: var(--rating-4)" title="5.9-<6.2"></div>
          <div class="legend-bar__segment" style="background-color: var(--rating-5)" title="Average: 6.2-<6.4"></div>
          <div class="legend-bar__segment" style="background-color: var(--rating-6)" title="6.4-<6.7"></div>
          <div class="legend-bar__segment" style="background-color: var(--rating-7)" title="6.7-<6.9"></div>
          <div class="legend-bar__segment" style="background-color: var(--rating-8)" title="Good: 6.9-<7.2"></div>
          <div class="legend-bar__segment" style="background-color: var(--rating-9)" title="7.2-<7.6"></div>
          <div class="legend-bar__segment" style="background-color: var(--rating-10)" title="Excellent: ≥7.6"></div>
        </div>
        <div class="legend-labels">
          <span class="legend-label" style="left: 10%">5.1</span>
          <span class="legend-label" style="left: 30%">5.9</span>
          <span class="legend-label" style="left: 50%">6.4</span>
          <span class="legend-label" style="left: 70%">6.9</span>
          <span class="legend-label" style="left: 90%">7.6</span>
        </div>
      </section>

      <!-- Complexity Section -->
      <section class="legend-section" aria-labelledby="complexity-legend">
        <h3 id="complexity-legend" class="legend-section__title">Complexity</h3>
        <p class="legend-section__description">Game weight/difficulty (1-5 scale)</p>
        <div class="legend-shapes" role="img" aria-label="Complexity scale from light to expert">
          <div class="legend-shape" title="Light: 1-2">
            <img src="/circle.png" alt="" class="legend-shape__icon" aria-hidden="true" />
          </div>
          <div class="legend-shape" title="Medium: 2-3">
            <img src="/triangle.png" alt="" class="legend-shape__icon" aria-hidden="true" />
          </div>
          <div class="legend-shape" title="Heavy: 3-4">
            <img src="/diamond.png" alt="" class="legend-shape__icon" aria-hidden="true" />
          </div>
          <div class="legend-shape" title="Expert: 4+">
            <img src="/star.png" alt="" class="legend-shape__icon" aria-hidden="true" />
          </div>
        </div>
        <div class="legend-labels">
          <span class="legend-label" style="left: 0%; transform: translateX(0)">1</span>
          <span class="legend-label" style="left: 25%">2</span>
          <span class="legend-label" style="left: 50%">3</span>
          <span class="legend-label" style="left: 75%">4</span>
          <span class="legend-label" style="left: 100%; transform: translateX(-100%)">5</span>
        </div>
      </section>

      <!-- Link Strength Section -->
      <section class="legend-section" aria-labelledby="link-legend">
        <h3 id="link-legend" class="legend-section__title">Link Strength</h3>
        <p class="legend-section__description">Connection strength between games</p>
        <div class="legend-bar" role="img" aria-label="Link strength from weak to very strong">
          <div class="legend-bar__segment" style="background-color: var(--link-weak)" title="Weak connection"></div>
          <div class="legend-bar__segment" style="background-color: var(--link-light)" title="Light connection"></div>
          <div class="legend-bar__segment" style="background-color: var(--link-moderate)" title="Moderate connection"></div>
          <div class="legend-bar__segment" style="background-color: var(--link-strong)" title="Strong connection"></div>
          <div class="legend-bar__segment" style="background-color: var(--link-very-strong)" title="Very strong connection"></div>
        </div>
        <div class="legend-labels">
          <span class="legend-label" style="left: 0%; transform: translateX(0)">Low</span>
          <span class="legend-label" style="left: 100%; transform: translateX(-100%)">High</span>
        </div>
      </section>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseCard from './base/BaseCard.vue'

const isMobile = window.innerWidth < 640
const isExpanded = ref(!isMobile)
</script>

<style scoped>
.legend-card {
  position: fixed;
  left: var(--space-2);
  bottom: var(--space-2);
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: var(--backdrop-blur-sm);
  padding: var(--space-3) var(--space-4);
  width: 400px;
  max-width: calc(100vw - var(--space-4));
  color: var(--color-text-inverse);
  z-index: var(--z-sticky);
  transition: all var(--duration-normal) var(--ease-out);
  cursor: pointer;
}

.legend-card--collapsed {
  width: auto;
  padding: var(--space-2) var(--space-3);
}

/* Mobile Toggle */
.legend-card__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
  background: none;
  border: none;
  color: var(--accent-400);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  padding: var(--space-1) 0;
  cursor: pointer;
  user-select: none;
}

.legend-card__toggle:hover {
  color: var(--accent-300);
}

.legend-card__toggle-text {
  flex: 1;
  text-align: left;
}

.legend-card__toggle-icon {
  font-size: var(--text-xs);
  opacity: 0.7;
  transition: transform var(--duration-fast) var(--ease-out);
}

.legend-card__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Legend Section */
.legend-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.legend-section:last-child {
  margin-bottom: 0;
}

.legend-section__title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.legend-section__description {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  line-height: var(--leading-tight);
}

/* Legend Bar (for gradients) */
.legend-bar {
  display: flex;
  height: 28px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.legend-bar__segment {
  flex: 1;
  cursor: help;
  transition: transform var(--duration-fast) var(--ease-out);
}

.legend-bar__segment:hover {
  transform: scaleY(1.15);
  z-index: var(--z-raised);
}

/* Legend Shapes (for complexity) */
.legend-shapes {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-2) 0;
}

.legend-shape {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  cursor: help;
  transition: transform var(--duration-fast) var(--ease-out);
}

.legend-shape:hover {
  transform: translateY(-2px);
}

.legend-shape__icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.legend-shape__label {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.8);
  font-weight: var(--font-medium);
}

/* Legend Labels */
.legend-labels {
  position: relative;
  height: 16px;
  margin-top: var(--space-1);
}

.legend-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .legend-card {
    left: var(--space-2);
    bottom: var(--space-2);
    width: calc(100vw - var(--space-4));
  }

  .legend-card--collapsed {
    width: auto;
  }

  .legend-card.legend-card--collapsed:not(.legend-card--collapsed) {
    max-height: 80vh;
    overflow-y: auto;
    z-index: var(--z-modal);
  }

  .legend-section__title {
    font-size: var(--text-xs);
  }

  .legend-section__description {
    font-size: 10px;
  }

  .legend-bar {
    height: 20px;
  }

  .legend-shape__icon {
    width: 20px;
    height: 20px;
  }

  .legend-shape__label {
    font-size: 10px;
  }

  .legend-label {
    font-size: 10px;
  }
}

@media (prefers-color-scheme: light) {
  .legend-card {
    background: rgba(255, 255, 255, 0.3);
    color: var(--color-text);
  }

  .legend-section__title {
    color: var(--color-heading);
  }

  .legend-section__description {
    color: var(--color-text-soft);
  }

  .legend-shape__icon {
    filter: brightness(1) invert(0) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }

  .legend-shape__label {
    color: var(--color-text-soft);
  }

  .legend-label {
    color: var(--color-text);
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
  }

  .legend-bar {
    border-color: var(--color-border);
  }
}
</style>
