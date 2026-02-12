<template>
  <span :class="['base-chip', `base-chip--${variant}`, `base-chip--${size}`]">
    <slot></slot>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md'
}>()
</script>

<script lang="ts">
export default {
  name: 'BaseChip',
}
</script>

<style scoped>
.base-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
  white-space: nowrap;
  transition: background-color var(--duration-fast) var(--ease-out);
}

/* Sizes */
.base-chip--sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  line-height: var(--leading-tight);
}

.base-chip--md {
  padding: 4px var(--space-3);
  font-size: var(--text-sm);
  line-height: var(--leading-tight);
}

/* Variants */
.base-chip--default {
  background-color: var(--color-surface);
  color: var(--color-text-soft);
  border: 1px solid var(--color-border);
}

.base-chip--primary {
  background-color: var(--primary-100);
  color: var(--primary-700);
  border: 1px solid var(--primary-200);
}

@media (prefers-color-scheme: dark) {
  .base-chip--primary {
    background-color: rgba(59, 130, 246, 0.15);
    color: var(--primary-400);
    border-color: rgba(59, 130, 246, 0.3);
  }
}

.base-chip--accent {
  background-color: var(--accent-100);
  color: var(--accent-700);
  border: 1px solid var(--accent-200);
}

@media (prefers-color-scheme: dark) {
  .base-chip--accent {
    background-color: rgba(20, 184, 166, 0.15);
    color: var(--accent-400);
    border-color: rgba(20, 184, 166, 0.3);
  }
}

.base-chip--success {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

@media (prefers-color-scheme: dark) {
  .base-chip--success {
    background-color: rgba(16, 185, 129, 0.15);
    color: #6ee7b7;
    border-color: rgba(16, 185, 129, 0.3);
  }
}

.base-chip--warning {
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

@media (prefers-color-scheme: dark) {
  .base-chip--warning {
    background-color: rgba(245, 158, 11, 0.15);
    color: #fcd34d;
    border-color: rgba(245, 158, 11, 0.3);
  }
}

.base-chip--error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

@media (prefers-color-scheme: dark) {
  .base-chip--error {
    background-color: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.3);
  }
}
</style>
