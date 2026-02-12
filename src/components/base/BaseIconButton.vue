<template>
  <button
    :class="['base-icon-button', `base-icon-button--${size}`, `base-icon-button--${variant}`]"
    :disabled="disabled"
    :type="type"
    :aria-label="ariaLabel"
    :title="title || ariaLabel"
    @click="$emit('click', $event)"
  >
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  ariaLabel: string // Required for accessibility
  title?: string
}>()

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<script lang="ts">
export default {
  name: 'BaseIconButton',
}
</script>

<style scoped>
.base-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  background: none;
  color: var(--color-text-soft);
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
}

.base-icon-button:hover:not(:disabled) {
  color: var(--color-text);
  background-color: var(--color-surface);
}

.base-icon-button:active:not(:disabled) {
  transform: scale(0.95);
}

.base-icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes - All meet minimum touch target */
.base-icon-button--sm {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
}

.base-icon-button--sm :deep(svg) {
  width: 18px;
  height: 18px;
}

.base-icon-button--md {
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  border-radius: var(--radius-md);
}

.base-icon-button--md :deep(svg) {
  width: 20px;
  height: 20px;
}

.base-icon-button--lg {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
}

.base-icon-button--lg :deep(svg) {
  width: 24px;
  height: 24px;
}

/* Variants */
.base-icon-button--default:hover:not(:disabled) {
  background-color: var(--color-surface);
}

.base-icon-button--ghost {
  background-color: transparent;
}

.base-icon-button--ghost:hover:not(:disabled) {
  background-color: var(--color-surface);
}

.base-icon-button--danger {
  color: var(--error-500);
}

.base-icon-button--danger:hover:not(:disabled) {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error-600);
}
</style>
