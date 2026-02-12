<template>
  <div v-if="isOpen" class="base-panel-overlay" :class="{ 'base-panel-overlay--visible': isOpen }" @click="handleOverlayClick">
    <div :class="['base-panel', `base-panel--${position}`, { 'base-panel--visible': isOpen }]" :style="{ width: computedWidth }" @click.stop>
      <!-- Header -->
      <div v-if="showHeader" class="base-panel__header">
        <slot name="header">
          <h2 v-if="title" class="base-panel__title">{{ title }}</h2>
        </slot>
        <BaseIconButton v-if="showClose" variant="ghost" size="md" ariaLabel="Close panel" @click="handleClose">
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

      <!-- Content -->
      <div class="base-panel__content">
        <slot></slot>
      </div>

      <!-- Footer -->
      <div v-if="$slots.footer" class="base-panel__footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import BaseIconButton from './BaseIconButton.vue'

const props = defineProps<{
  isOpen: boolean
  position?: 'left' | 'right' | 'bottom'
  title?: string
  showHeader?: boolean
  showClose?: boolean
  closeOnOverlay?: boolean
  width?: string
}>()

const emit = defineEmits<{
  close: []
  'update:isOpen': [value: boolean]
}>()

const computedWidth = computed(() => {
  if (props.width) return props.width
  if (props.position === 'bottom') return '100%'
  return 'var(--sidebar-width)'
})

function handleClose() {
  emit('close')
  emit('update:isOpen', false)
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    handleClose()
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isOpen) {
    handleClose()
  }
}

// Prevent body scroll when panel is open
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
)

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
})
</script>

<script lang="ts">
export default {
  name: 'BasePanel',
}
</script>

<style scoped>
.base-panel-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: var(--z-overlay);
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out);
}

.base-panel-overlay--visible {
  opacity: 1;
}

.base-panel {
  position: fixed;
  background-color: var(--color-background);
  box-shadow: var(--shadow-2xl);
  display: flex;
  flex-direction: column;
  z-index: var(--z-overlay);
  transition: transform var(--duration-normal) var(--ease-emphasized);
}

/* Position Variants */
.base-panel--left {
  top: 0;
  left: 0;
  bottom: 0;
  transform: translateX(-100%);
  border-right: 1px solid var(--color-border);
}

.base-panel--left.base-panel--visible {
  transform: translateX(0);
}

.base-panel--right {
  top: 0;
  right: 0;
  bottom: 0;
  transform: translateX(100%);
  border-left: 1px solid var(--color-border);
}

.base-panel--right.base-panel--visible {
  transform: translateX(0);
}

.base-panel--bottom {
  left: 0;
  right: 0;
  bottom: 0;
  height: 84px;
  transform: translateY(100%);
  border-top: 1px solid var(--color-border);
}

.base-panel--bottom.base-panel--visible {
  transform: translateY(0);
}

/* Header */
.base-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.base-panel__title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin: 0;
}

/* Content */
.base-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

/* Footer */
.base-panel__footer {
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .base-panel--left,
  .base-panel--right {
    width: 100vw !important;
  }

  .base-panel__header {
    padding: var(--space-3);
  }

  .base-panel__content {
    padding: var(--space-3);
  }

  .base-panel__footer {
    padding: var(--space-3);
  }
}
</style>
