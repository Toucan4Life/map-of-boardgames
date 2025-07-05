<script setup lang="ts">
import { getGameInfo, type GameDetail } from '@/lib/bggClient'
import { computed, ref, watchEffect } from 'vue'

interface Repo {
  name: string
  id: number
}

const gameDetail = ref<GameDetail>()
const props = defineProps<Repo>()

const emit = defineEmits<{ listConnections: [] }>()
const repoLink = computed(() => {
  return `https://boardgamegeek.com/boardgame/` + props.id.toString()
})

watchEffect(() => {
  getGameInfo(props.id.toString())
    .then((resp) => {
      if (resp) gameDetail.value = resp
    })
    .catch((error: unknown) => {
      console.error('Error fetching game info:', error)
    })
})

function listConnections(): void {
  emit('listConnections')
}
</script>

<template>
  <div class="repo-viewer">
    <div>
      <div class="game-header-image">
        <img class="img-responsive" :src="gameDetail?.imageUrl" alt="" />
      </div>
      <div class="game-header-title">
        <div class="container">
          <img src="../../public/circle.png" style="width: 40px" alt="circle" class="centered" />
          <div class="centered">{{ gameDetail?.rating }}</div>
        </div>
        <div class="game-header-title-info">
          <h2>
            <a :href="repoLink" target="_blank">{{ name + ' (' + gameDetail?.yearPublished + ')' }}</a>
          </h2>
          <p>
            <span>{{ gameDetail?.description }}</span>
          </p>
        </div>
      </div>
      <div>
        <ul class="gameplay">
          <li class="gameplay-item" style="border-top: 1px solid #c6c6c6; border-right: 1px solid #716d6d">
            <h4 v-if="gameDetail?.minPlayers != gameDetail?.maxPlayers">{{ gameDetail?.minPlayers }}-{{ gameDetail?.maxPlayers }} players</h4>
            <h4 v-if="gameDetail?.minPlayers == gameDetail?.maxPlayers">{{ gameDetail?.minPlayers }} players</h4>
            <h5>Community: {{ gameDetail?.recommendedPlayers }} -- Best: {{ gameDetail?.bestPlayers }}</h5>
          </li>
          <li class="gameplay-item" style="border-top: 1px solid #c6c6c6">
            <h4 v-if="gameDetail?.minPlayTime != gameDetail?.maxPlayTime">{{ gameDetail?.minPlayTime }}-{{ gameDetail?.maxPlayTime }} minutes</h4>
            <h4 v-if="gameDetail?.minPlayTime == gameDetail?.maxPlayTime">{{ gameDetail?.minPlayTime }} minutes</h4>
            <h5>Playing Time</h5>
          </li>
          <li class="gameplay-item" style="border-top: 1px solid #716d6d; border-right: 1px solid #716d6d">
            <h4>Age {{ gameDetail?.minAge }}+</h4>
            <h5>Community: {{ gameDetail?.recommendedAge }}+</h5>
          </li>
          <li class="gameplay-item" style="border-top: 1px solid #716d6d">
            <h4>Weight: {{ gameDetail?.weight }}/5</h4>
            <h5>Complexity Rating</h5>
          </li>
        </ul>
      </div>
      <div class="actions row">
        <a href="#" @click.prevent="listConnections()">List connections</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gameplay-item {
  flex-basis: 50%;
  padding: 10px;
  text-align: center;
  list-style: none;
  box-sizing: border-box;
}
.gameplay {
  display: flex;
  flex-wrap: wrap;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  padding: 0;
  width: 100%;
}
.game-header-title {
  display: flex;
  margin-bottom: 10px;
}
.container {
  position: relative;
  text-align: center;
  color: white;
  flex-basis: 100px;
  margin-right: 15px;
}
.centered {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.game-header-image {
  width: 100%;
  padding: 10px;
  text-align: center;
}

.img-responsive {
  margin-left: auto;
  margin-right: auto;
  max-width: 100%;
  max-height: 250px;
}

h2 {
  font-size: 24px;
  max-width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;
}

.repo-viewer {
  padding-top: 70px;
  padding-left: 8px;
  padding-right: 8px;
}

h2 a {
  color: var(--color-link-hover);
}
.repo-description {
  line-height: 1.2em;
  max-width: 100%;
  text-overflow: ellipsis;
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
.tags {
  overflow-y: hidden;
  overflow-x: auto;
  white-space: nowrap;
}
.tags a {
  margin-right: 8px;
  display: inline-block;
  background-color: var(--color-tag-bg);
  color: var(--color-tag-text);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 16px;
}

.tags a:hover {
  color: var(--color-link-hover);
}
.sign-in-container {
  margin-top: 16px;
  font-size: 12px;
}
.sign-in-container a {
  color: var(--critical-call-to-action);
}

.actions {
  border-top: 1px solid var(--color-border);
  margin-top: 8px;
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  height: 32px;
  align-items: stretch;
}
.actions a {
  align-items: center;
  display: flex;
  background: var(--color-background-mute);
  padding: 0 8px;
  flex: 1;
  justify-content: center;
}
.not-found {
  margin-top: 16px;
  border-top: 1px solid var(--color-border);
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>

<style>
.readme-content {
  border-top: 1px solid var(--color-border);
  padding-top: 8px;
  overflow-x: hidden;
}
.readme-content a {
  color: var(--color-link-hover);
}
.readme-content p {
  margin-bottom: 16px;
  margin-top: 0;
}
.readme-content h1 {
  border-bottom: 1px solid var(--color-border);
}
.readme-content pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  border-radius: 6px;
}
.readme-content img {
  max-width: 100%;
}
</style>
