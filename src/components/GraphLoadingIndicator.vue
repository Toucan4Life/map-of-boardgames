<script setup lang="ts">
import { computed } from 'vue'
import LoadingIcon from './LoadingIcon.vue'

const props = defineProps<{
  status: 'downloading' | 'decompressing' | 'parsing' | 'serializing' | 'reconstructing'
}>()

const statusText = computed(() => {
  switch (props.status) {
    case 'downloading':
      return 'Downloading graph...'
    case 'decompressing':
      return 'Decompressing data...'
    case 'parsing':
      return 'Parsing graph...'
    case 'serializing':
      return 'Preparing data...'
    case 'reconstructing':
      return 'Building graph...'
    default:
      return 'Loading...'
  }
})
</script>

<template>
  <div class="graph-loading-indicator">
    <div class="loading-content">
      <LoadingIcon />
      <p class="loading-text">{{ statusText }}</p>
    </div>
  </div>
</template>

<style scoped>
.graph-loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  pointer-events: none;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  padding: 24px 32px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

.loading-text {
  margin: 0;
  color: white;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.loader {
  width: 32px;
  height: 32px;
}
</style>
