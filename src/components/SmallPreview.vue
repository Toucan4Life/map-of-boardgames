<script setup lang="ts">
interface Repo {
  name: string
  id: number
}

const props = defineProps<Repo>()

const emit = defineEmits(['show-full-preview'])

// const repoInfo = reactive({
//   state: 'LOADING',
//   name: '',
//   description: '',
//   language: '',
//   stars: 0,
//   forks: 0,
//   watchers: 0,
//   branch: '',
//   topics: [],
//   license: '',
//   updated_at: '',
//   remainingRequests: 0,
// })

// const errorInfo = ref(null)

function showFullPreview() {
  console.log(JSON.stringify(props))
  emit('show-full-preview', props.name)
}
</script>
<template>
  <a href="#" @click.prevent="showFullPreview" class="small-preview-container">
    <div class="header">
      <span>{{ props.name }}</span>
    </div>
  </a>
</template>

<style scoped>
.loader {
  margin: 0px;
}
.header {
  font-size: 16px;
  height: 36px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.small-preview-container {
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-color);
}
div.error {
  color: var(--critical-call-to-action);
}
.info {
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.byline {
  margin: 8px 0;
  font-size: 12px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
}

.byline span {
  margin-right: 8px;
  display: inline-block;
}
</style>
