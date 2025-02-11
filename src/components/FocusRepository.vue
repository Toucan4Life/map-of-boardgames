<script setup lang="ts">
import type { IFocusViewModel, Repositories } from '@/lib/FocusViewModel'

const props = defineProps<{ vm: IFocusViewModel }>()

const emit = defineEmits(['selected', 'close'])

function showDetails(repo: IFocusViewModel | Repositories, event: MouseEvent): void {
  emit('selected', {
    text: repo.name,
    lon: repo.lngLat[1],
    lat: repo.lngLat[0],
    skipAnimation: event.altKey,
    id: repo.id,
  })
}
function closePanel(): void {
  emit('close')
}

function getLink(repo: IFocusViewModel | Repositories): string {
  return 'https://boardgamegeek.com/boardgame/' + repo.id
}
</script>
<template>
  <div class="neighbors-container">
    <div class="names-container">
      <div class="header-container">
        <div class="header">
          <h2>
            <a :href="getLink(props.vm)" @click.prevent="showDetails(props.vm, $event)" class="normal">{{ props.vm.name }}</a>
          </h2>
          <h3 v-if="!props.vm.loading">Direct connections ({{ props.vm.repos.length }})</h3>
          <h3 v-else>Loading...</h3>
        </div>
        <a class="close-btn" href="#" @click.prevent="closePanel()">
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
            class="feather feather-x-circle"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </a>
      </div>

      <ul v-if="props.vm.repos">
        <li v-for="repo in props.vm.repos" :key="repo.name">
          <a :href="getLink(repo)" @click.prevent="showDetails(repo, $event)" target="_blank">
            {{ repo.name }}
            <!-- <span v-if="repo.isExternal" title="External country">E</span> -->
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>
<style scoped>
.names-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
h2 {
  margin-bottom: 4px;
}

ul {
  list-style: none;
  padding: 0;
  overflow-y: auto;
}
.chat-container {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border);
}

.close-btn {
  margin: 8px;
}
.header-container {
  display: flex;
}
.header {
  flex: 1;
}
</style>
