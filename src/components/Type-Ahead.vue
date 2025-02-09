<template>
  <div class="ak-typeahead" v-click-outside="hideSuggestions">
    <a href="#" class="menu-opener" @click.prevent="menuClicked">
      <img :src="currentUser.avatar_url" class="avatar" v-if="currentUser" />
      <!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="feather feather-info"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    </a>
    <a href="#" class="menu-opener" @click.prevent="showAdvancedSearch">
      <img :src="currentUser.avatar_url" class="avatar" v-if="currentUser" />
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
        class="feather feather-more-vertical"
      >
        <circle cx="12" cy="12" r="1"></circle>
        <circle cx="12" cy="5" r="1"></circle>
        <circle cx="12" cy="19" r="1"></circle>
      </svg>
    </a>
    <input
      ref="input"
      autofocus
      type="text"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      :value="currentQuery"
      :placeholder="placeholder"
      @input="handleInput"
      @keydown="cycleTheList"
    />
    <a type="submit" class="search-submit" href="#" @click.prevent="clearSearch" v-if="currentQuery || showClearButton">
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
    <ul v-if="showSuggestions" class="suggestions">
      <li v-for="(suggestion, index) in suggestions" :key="index">
        <a
          @click.prevent="pickSuggestion(suggestion)"
          class="suggestion"
          :class="{ selected: suggestion.selected }"
          href="#"
          v-html="suggestion.html"
        ></a>
      </li>
    </ul>

    <ul v-if="showLoading" class="suggestions">
      <li class="searching">
        <span v-if="!loadingError"
          >Downloading search index for letter <b>{{ currentQuery[0] }}</b
          >...</span
        >
        <div v-if="loadingError" class="loading-error">
          <div>Failed to get project completions:</div>
          <pre>{{ loadingError }}</pre>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { SearchResult } from '@/lib/createFuzzySearcher.ts'
import bus from '../lib/bus.ts'
import { getCurrentUser, type User } from '../lib/githubClient.ts'
import { onBeforeUnmount, onMounted, ref } from 'vue'
const emit = defineEmits(['menuClicked', 'showAdvancedSearch', 'selected', 'beforeClear', 'cleared', 'inputChanged'])

const props = defineProps({
  placeholder: {
    default: 'Type here',
  },
  showClearButton: {
    default: '',
  },
  query: {
    default: '',
  },
  delay: {
    default: 80,
  },
})

const currentSelected = ref(-1)
const showSuggestions = ref(false)
const showLoading = ref(false)
const loadingError = ref(null)
const suggestions = ref(new Array<SearchResult>())
const currentUser = ref<User>()
const currentQuery = ref(props.query)
const pendingKeyToShow = ref(false)
const previous = ref<number>()
const input = ref(null)

onMounted(() => {
  updateCurrentUser()
  bus.on('auth-changed', updateCurrentUser)
})
onBeforeUnmount(() => {
  bus.off('auth-changed', updateCurrentUser)
})

function updateCurrentUser() {
  getCurrentUser().then((user) => {
    currentUser.value = user
  })
}

function menuClicked() {
  emit('menuClicked')
}

function showAdvancedSearch() {
  emit('showAdvancedSearch')
}

function hideSuggestions() {
  showSuggestions.value = false
  showLoading.value = false
  pendingKeyToShow.value = true
}

function showIfNeeded(visible: boolean) {
  // we need to wait until next key press before we can show suggestion.
  // This avoids race conditions between search results and form submission
  if (!pendingKeyToShow.value) showSuggestions.value = visible
}

function pickSuggestion(suggestion: { text: string }) {
  currentQuery.value = suggestion.text
  hideSuggestions()
  emit('selected', suggestion)
}

function clearSearch() {
  const payload = { shouldProceed: true }
  emit('beforeClear', payload)
  if (!payload.shouldProceed) return

  currentQuery.value = ''
  getSuggestionsInternal()
  // focus();
  emit('cleared')
}

function handleInput(event: Event) {
  currentQuery.value = (event.target as HTMLInputElement).value
  emit('inputChanged')
  getSuggestionsInternal()
}

function getSuggestionsInternal() {
  if (previous.value) {
    window.clearTimeout(previous.value)
    previous.value = undefined
  }
  if (!currentQuery.value) {
    showSuggestions.value = false
    return
  }

  previous.value = window.setTimeout(() => {
    const p = window.fuzzySearcher.find(currentQuery.value.toLowerCase())

    if (Array.isArray(p)) {
      suggestions.value = p.map(toOwnSuggestion)
      currentSelected.value = -1
      showIfNeeded(p && p.length > 0)
    } else if (p) {
      loadingError.value = null
      showLoading.value = true
      p.then(
        (sug: void | SearchResult[]) => {
          if (sug === undefined) return // resolution of cancelled promise
          showLoading.value = false
          suggestions.value = sug || []
          suggestions.value = sug.map(toOwnSuggestion)
          currentSelected.value = -1
          showIfNeeded(suggestions.value && suggestions.value.length > 0)
        },
        (err) => {
          loadingError.value = err
        },
      )
    } else {
      throw new Error('Could not parse suggestions response')
    }
  }, props.delay)
}

function cycleTheList(e: KeyboardEvent): void {
  const items = suggestions
  let currentS = currentSelected.value
  // Any key is alright for the suggestions
  pendingKeyToShow.value = false

  let dx
  if (e.which === 38) {
    // UP
    dx = -1
  } else if (e.which === 40) {
    // down
    dx = 1
  } else if (e.which === 13) {
    // Enter === accept
    if (items.value[currentS]) {
      pickSuggestion(items.value[currentS])
    } else {
      pickSuggestion({ text: currentQuery.value })
    }
    e.preventDefault()
    return
  } else if (e.which === 27) {
    // Esc === close
    hideSuggestions()
  }

  if (!dx || items.value.length === 0) return

  e.preventDefault()

  if (currentSelected.value >= 0) {
    suggestions.value[currentS].selected = false
  }
  currentSelected.value += dx
  if (currentS < 0) currentS = items.value.length - 1
  if (currentS >= items.value.length) currentS = 0

  suggestions.value[currentS].selected = true
  currentSelected.value = currentS
}

function toOwnSuggestion(x: SearchResult): SearchResult {
  return {
    selected: false,
    text: x.text,
    html: x.html,
    lon: x.lon,
    lat: x.lat,
    id: x.id,
    skipAnimation: false,
  }
}
</script>

<style>
img.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  aspect-ratio: auto 24 / 24;
}

.ak-typeahead {
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background: var(--color-background-soft);
}

.menu-opener {
  display: flex;
  align-items: center;
  padding: 0 8px;
  background: var(--color-background-soft);
}

.menu-opener:hover,
.menu-opener:focus {
  background: var(--color-border-hover);
}

.search-submit {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  align-items: center;
  text-decoration: none;
  display: flex;
  flex-shrink: 0;
  width: 48px;
  justify-content: center;
  outline: none;
}

.search-submit:hover,
.search-submit:focus {
  background: var(--color-border-hover);
}

.suggestion {
  display: block;
  width: 100%;
  height: 28px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  align-items: center;
  padding-left: 10px;
  text-decoration: none;
  font-weight: bold;
  color: var(--color-text);
}

.suggestion b {
  font-weight: normal;
}

.suggestion:hover,
.suggestion.selected {
  background-color: var(--color-border-hover);
  color: var(--color-text);
}

.suggestions {
  position: absolute;
  top: 48px;
  width: 100%;
  padding: 0;
  background: var(--color-background-soft);
  list-style-type: none;
  margin: 0;
  border-top: 1px solid var(--color-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.suggestions .searching {
  margin: 8px;
}

.suggestions .loading-error pre {
  color: orangered;
  overflow-x: auto;
  padding-bottom: 14px;
}

input[type='text'] {
  height: 100%;
  width: 100%;
  padding-right: 48px;
  padding-left: 10px;
  font-size: 18px;
  border: 0;
  border-radius: 0;
  background: var(--color-background-soft);
  color: var(--color-text);
}

input:focus,
input:hover {
  background: var(--color-background-mute);
}

input:focus {
  outline: none;
}

input::placeholder {
  color: var(--color-text);
}

.searching b {
  font-weight: bold;
}

@media (max-width: 600px) {
  .suggestion {
    height: 42px;
  }
}
</style>
