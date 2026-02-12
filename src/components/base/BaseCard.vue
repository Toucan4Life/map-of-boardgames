<template>
  <div :class="['base-card', `base-card--${elevation}`, { 'base-card--interactive': interactive }]" @click="handleClick">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  elevation?: 'flat' | 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

function handleClick(event: MouseEvent) {
  emit('click', event)
}
</script>

<script lang="ts">
export default {
  name: 'BaseCard',
}
</script>

<style scoped>
.base-card {
  background-color: var(--color-background-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  transition:
    box-shadow var(--duration-normal) var(--ease-out),
    transform var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

/* Elevation Levels */
.base-card--flat {
  box-shadow: none;
}

.base-card--sm {
  box-shadow: var(--shadow-sm);
}

.base-card--md {
  box-shadow: var(--shadow-md);
}

.base-card--lg {
  box-shadow: var(--shadow-lg);
}

.base-card--xl {
  box-shadow: var(--shadow-xl);
}

/* Interactive State */
.base-card--interactive {
  cursor: pointer;
}

.base-card--interactive:hover {
  border-color: var(--color-border-hover);
  transform: translateY(-2px);
}

.base-card--interactive:hover.base-card--sm {
  box-shadow: var(--shadow-md);
}

.base-card--interactive:hover.base-card--md {
  box-shadow: var(--shadow-lg);
}

.base-card--interactive:hover.base-card--lg {
  box-shadow: var(--shadow-xl);
}

.base-card--interactive:active {
  transform: translateY(0);
}
</style>
