<script setup lang="ts">
import { ref } from 'vue'
import CustomMinMaxSlider from './CustomMinMaxSlider.vue'
const emit = defineEmits<{ close: []; search: [searchR: AdvSearchResult] }>()

function close(): void {
  emit('close')
}

export interface AdvSearchResult {
  minWeight: number
  maxWeight: number
  minRating: number
  maxRating: number
  minPlaytime: number
  maxPlaytime: number
  minPlayers: number
  maxPlayers: number
  playerChoice: number
  tags: string[] | undefined
  minYear: number
  maxYear: number
}

function search(
  minW: number,
  maxW: number,
  minR: number,
  maxR: number,
  minP: number,
  maxP: number,
  minPl: number,
  maxPl: number,
  pChoice: number,
  minYear: number,
  maxYear: number,
): void {
  // console.log(JSON.stringify({
  //   minWeight: minW, maxWeight: maxW,
  //   minRating: minR, maxRating: maxR,
  //   minPlaytime: timescale[minP], maxPlaytime: timescale[maxP],
  //   minPlayers: playersScale[minPl], maxPlayers: playersScale[maxPl],
  //   playerChoice: pChoice,
  //   tags: selectedTags.value
  // }))
  emit('search', {
    minWeight: minW,
    maxWeight: maxW,
    minRating: minR,
    maxRating: maxR,
    minPlaytime: timescale[minP],
    maxPlaytime: timescale[maxP],
    minPlayers: playersScale[minPl],
    maxPlayers: playersScale[maxPl],
    playerChoice: pChoice,
    tags: selectedTags.value,
    minYear: yearscale[minYear],
    maxYear: yearscale[maxYear],
  })
}

const sliderMin = ref(1)
const sliderMax = ref(5)
const sliderMinR = ref(0)
const sliderMaxR = ref(10)
const sliderMinP = ref(0)
const sliderMaxP = ref(13)
const sliderMinPl = ref(0)
const sliderMaxPl = ref(9)
const sliderMinY = ref(0)
const sliderMaxY = ref(16)
const selectedTags = ref<string[]>()
const yearscale = [0, 1, 1500, 1900, 1950, 1980, 1990, 2000, 2005, 2010, 2015, 2020, 2021, 2022, 2023, 2024, 2025]
const timescale = [0, 1, 5, 15, 30, 45, 60, 90, 120, 180, 240, 480, 960, 1800]
const playersScale = [1, 2, 3, 4, 5, 6, 7, 8, 10, 15]
// reassigned in the template
// eslint-disable-next-line prefer-const
let playersChoice = 0
</script>

<template>
  <div>
    <div class="row">
      <h2>Advanced Search</h2>
      <!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
      <a href="#" class="close-btn" @click.prevent="close">
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
    <div class="container">
      <div class="slider-cont">
        <h3>Year Published: {{ yearscale[sliderMinY] }} - {{ yearscale[sliderMaxY] }}</h3>
        <CustomMinMaxSlider v-model:min-value="sliderMinY" v-model:max-value="sliderMaxY" :min="0" :max="16" />
      </div>
      <div class="slider-cont">
        <h3>Game rating: {{ sliderMinR }} - {{ sliderMaxR }}</h3>
        <CustomMinMaxSlider v-model:min-value="sliderMinR" v-model:max-value="sliderMaxR" :min="0" :max="10" :step="0.1" />
      </div>
      <div class="slider-cont">
        <h3>Game complexity: {{ sliderMin }} - {{ sliderMax }}</h3>
        <CustomMinMaxSlider v-model:min-value="sliderMin" v-model:max-value="sliderMax" :min="1" :max="5" :step="0.1" />
      </div>
      <div class="slider-cont">
        <h3>Player count: {{ playersScale[sliderMinPl] }} - {{ playersScale[sliderMaxPl] }}</h3>
        <div ref="segm" class="segmented-control">
          <input id="radio1" v-model="playersChoice" name="segmented" type="radio" value="0" checked /><label for="radio1">Theorical</label>
          <input id="radio2" v-model="playersChoice" name="segmented" type="radio" value="1" /><label for="radio2">Recommended</label>
          <input id="radio3" v-model="playersChoice" name="segmented" type="radio" value="2" /><label for="radio3">Best</label>
        </div>
        <CustomMinMaxSlider v-model:min-value="sliderMinPl" v-model:max-value="sliderMaxPl" :min="0" :max="9" />
      </div>
      <div class="slider-cont">
        <h3>Game length (min): {{ timescale[sliderMinP] }} - {{ timescale[sliderMaxP] }}</h3>
        <CustomMinMaxSlider v-model:min-value="sliderMinP" v-model:max-value="sliderMaxP" :min="0" :max="13" />
      </div>
      <!-- <div>
        <label class="typo__label" for="ajax">Tags:</label>
        <multiselect v-model="selectedTags" id="ajax" placeholder="Type to search" open-direction="bottom"
          :options="countries" :multiple="true" :searchable="true" :internal-search="true" :clear-on-select="false"
          :close-on-select="false" :options-limit="300" :limit="10" :max-height="600" :show-no-results="false"
          :hide-selected="true">
          <template #tag="{ option, remove }">
            <span class="custom__tag">
              <span>{{ option }}</span>
              <span class="custom__remove" @click="remove(option)">❌</span>
            </span>
          </template>
          <template #clear="props">
            <div class="multiselect__clear" v-if="selectedTags.length"
              @mousedown.prevent.stop="clearAll(props.search)"></div>
          </template>
          <template #noResult>
            <span>Oops! No elements found. Consider changing the search query.</span>
          </template>
        </multiselect>
      </div> -->
      <div class="actions row">
        <a
          href="#"
          @click.prevent="
            search(
              sliderMin,
              sliderMax,
              sliderMinR,
              sliderMaxR,
              sliderMinP,
              sliderMaxP,
              sliderMinPl,
              sliderMaxPl,
              playersChoice,
              sliderMinY,
              sliderMaxY,
            )
          "
          >Search</a
        >
      </div>
    </div>
  </div>
</template>
<style src="vue-multiselect/dist/vue-multiselect.css"></style>
<style scoped>
/* basic positioning */
.custom__tag {
  display: inline-block;
  padding: 3px 12px;
  background: #d2d7ff;
  margin-right: 8px;
  margin-bottom: 8px;
  border-radius: 10px;
  cursor: pointer;
}

&:nth-child(even) {
  background: #daffee;
}

&:hover {
  background: #eaeaea;
}

.custom__remove {
  padding: 0px;
  font-size: 10px;
  margin-left: 5px;
}

.legend {
  list-style: none;
}

.legend li {
  float: left;
  margin-right: 10px;
}

.legend span {
  border: 1px solid #ccc;
  float: left;
  width: 12px;
  height: 12px;
  margin: 2px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.row h2 {
  margin: 8px 8px 0 8px;
  flex: 1;
}

.map-image {
  width: 64px;
  float: left;
}

.close-btn {
  align-self: stretch;
  align-items: center;
  display: flex;
  padding: 0 8px;
}

.container {
  padding: 8px;
  flex: 1;
  overflow-y: auto;
}

h4 {
  margin: 0;
  font-weight: normal;
  text-align: right;
}

.byline {
  margin: 0 8px 8px;
  font-size: 12px;
}

.user-info {
  margin: 8px;
}

p {
  margin: 0 0 8px 0;
  line-height: 1.5em;
}

b {
  font-weight: bold;
}

input[type='text'] {
  height: 9%;
  width: 100%;
  padding-right: 48px;
  padding-left: 10px;
  font-size: 18px;
  border: 0;
  border-radius: 0;
  background: var(--color-background-soft);
  color: var(--color-text);
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

.segmented-control {
  display: inline-flex;

  input[type='radio'] {
    display: none;
  }

  border-width: 2px;

  label {
    border: border-width solid slategrey;
    border-right: none;
    padding: 4px 8px;
    background: rgba(slategrey, 0.2);

    /* text-transform: uppercase; */
    color: #00704b;
    font-size: 12px;
    font-weight: bold;

    cursor: pointer;

    &:first-of-type {
      border-top-left-radius: 6px;
      border-bottom-left-radius: 6px;
    }

    &:last-of-type {
      border-top-right-radius: 6px;
      border-bottom-right-radius: 6px;
      border-right: border-width solid slategrey;
    }
  }
}

.segmented-control input:checked + label {
  background: slategrey;
  color: white;
  cursor: default;
}
</style>
