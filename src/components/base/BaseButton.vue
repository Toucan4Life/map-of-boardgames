<template>
  <button
    :class="[
      'base-button',
      `base-button--${variant}`,
      `base-button--${size}`,
      { 'base-button--full-width': fullWidth, 'base-button--loading': loading },
    ]"
    :disabled="disabled || loading"
    :type="type"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="base-button__spinner"></span>
    <span :class="{ 'base-button__content--hidden': loading }">
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
}>()

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<script lang="ts">
export default {
  name: 'BaseButton',
  inheritAttrs: false,
}
</script>

<style scoped>
.base-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-family-base);
  font-weight: var(--font-medium);
  line-height: var(--leading-none);
  text-align: center;
  border: none;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.base-button:active:not(:disabled) {
  transform: scale(0.98);
}

.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.base-button--sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
  border-radius: var(--radius-sm);
  min-height: 32px;
}

.base-button--md {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-base);
  border-radius: var(--radius-md);
  min-height: var(--touch-target-min);
}

.base-button--lg {
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-lg);
  border-radius: var(--radius-md);
  min-height: 52px;
}

/* Variants */
.base-button--primary {
  background-color: var(--color-link);
  color: var(--color-text-inverse);
}

.base-button--primary:hover:not(:disabled) {
  background-color: var(--color-link-hover);
}

.base-button--primary:active:not(:disabled) {
  background-color: var(--color-link-hover);
}

.base-button--secondary {
  background-color: var(--color-surface);
  color: var(--color-link);
  border: 1px solid var(--color-border);
}

.base-button--secondary:hover:not(:disabled) {
  background-color: var(--color-surface-hover);
  border-color: var(--color-border-hover);
  color: var(--color-link-hover);
}

.base-button--ghost {
  background-color: transparent;
  color: var(--color-link);
}

.base-button--ghost:hover:not(:disabled) {
  background-color: var(--color-surface);
  color: var(--color-link-hover);
}

.base-button--danger {
  background-color: var(--error-500);
  color: var(--color-text-inverse);
}

.base-button--danger:hover:not(:disabled) {
  background-color: var(--error-600);
}

/* Full Width */
.base-button--full-width {
  width: 100%;
}

/* Loading State */
.base-button--loading {
  pointer-events: none;
}

.base-button__content--hidden {
  visibility: hidden;
}

.base-button__spinner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
