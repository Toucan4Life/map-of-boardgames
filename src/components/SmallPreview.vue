<script setup lang="ts">
import { getGameInfo, type GameDetail } from '@/lib/bggClient'
import { ref, watchEffect } from 'vue'

interface Repo {
  name: string
  id: number
}

const props = defineProps<Repo>()
const gameDetail = ref<GameDetail>()
const emit = defineEmits<(e: 'show-full-preview', id: string) => void>()

watchEffect(() => {
  getGameInfo(props.id.toString())
    .then((resp) => {
      if (resp) gameDetail.value = resp
    })
    .catch((error: unknown) => {
      console.error('Error fetching game info:', error)
    })
})

function showFullPreview() {
  emit('show-full-preview', props.name)
}
</script>
<template>
  <a href="#" class="small-preview-container" @click.prevent="showFullPreview">
    <div class="header">
      <span>{{ props.name }}</span>
    </div>
    <div>
      <ul class="gameplay">
        <li class="gameplay-item" style="border-top: 1px solid #c6c6c6; border-right: 1px solid #716d6d">
          <h4 v-if="gameDetail?.minPlayers != gameDetail?.maxPlayers">{{ gameDetail?.minPlayers }}-{{ gameDetail?.maxPlayers }} players</h4>
          <h4 v-if="gameDetail?.minPlayers == gameDetail?.maxPlayers">{{ gameDetail?.minPlayers }} players</h4>
        </li>
        <li class="gameplay-item" style="border-top: 1px solid #c6c6c6; border-right: 1px solid #716d6d">
          <h4 v-if="gameDetail?.minPlayTime != gameDetail?.maxPlayTime">{{ gameDetail?.minPlayTime }}-{{ gameDetail?.maxPlayTime }} minutes</h4>
          <h4 v-if="gameDetail?.minPlayTime == gameDetail?.maxPlayTime">{{ gameDetail?.minPlayTime }} minutes</h4>
        </li>
        <li class="gameplay-item" style="border-top: 1px solid #c6c6c6; border-right: 1px solid #716d6d">
          <h4>Age {{ gameDetail?.minAge }}+</h4>
        </li>
        <li class="gameplay-item" style="border-top: 1px solid #c6c6c6">
          <h4>Weight: {{ gameDetail?.weight }}/5</h4>
        </li>
      </ul>
    </div>
  </a>
</template>

<style scoped>
.gameplay-item {
  flex-basis: 50%;
  padding: 5px;
  text-align: center;
  list-style: none;
  box-sizing: border-box;
}
.gameplay {
  display: flex;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  padding: 0;
  width: 100%;
}
.loader {
  margin: 0px;
}
.header {
  font-size: 16px;
  max-height: 100px;
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
  line-clamp: 3;
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
