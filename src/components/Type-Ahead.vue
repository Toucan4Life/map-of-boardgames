<template>
  <div v-click-outside="hideSuggestions" class="ak-typeahead">
    <a href="#" class="menu-opener" @click.prevent="emit('menuClicked')">
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
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </a>
    <a href="#" class="menu-opener" @click.prevent="emit('showAdvancedSearch')">
      <!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
      <svg fill="currentColor" height="24" width="24" viewBox="0 0 300.906 300.906" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M288.953,0h-277c-5.522,0-10,4.478-10,10v49.531c0,5.522,4.478,10,10,10h12.372l91.378,107.397v113.978c0,3.688,2.03,7.076,5.281,8.816c1.479,0.792,3.101,1.184,4.718,1.184c1.94,0,3.875-0.564,5.548-1.68l49.5-33c2.782-1.854,4.453-4.977,4.453-8.32v-80.978l91.378-107.397h12.372c5.522,0,10-4.478,10-10V10C298.953,4.478,294.476,0,288.953,0z M167.587,166.77c-1.539,1.809-2.384,4.105-2.384,6.48v79.305l-29.5,19.666V173.25c0-2.375-0.845-4.672-2.384-6.48L50.585,69.531h199.736L167.587,166.77z M278.953,49.531h-257V20h257V49.531z"
        />
      </svg>
    </a>

    <input
      ref="input"
      v-model="currentQuery"
      autofocus
      type="text"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      :placeholder="placeholder"
      @keydown="handleKeydown"
    />

    <a v-if="shouldShowClearButton" class="search-submit" href="#" @click.prevent="clearSearch">
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
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    </a>

    <ul v-if="suggestions.length" class="suggestions">
      <li v-for="(s, i) in suggestions" :key="i">
        <a class="suggestion" :class="{ selected: s.selected }" href="#" @click.prevent="pickSuggestion(s)">
          {{ `${s.text} (${s.year})` }}
        </a>
      </li>
    </ul>

    <ul v-if="showLoading" class="suggestions">
      <li class="searching">
        <span v-if="!loadingError">
          Downloading search index for letter <b>{{ currentQuery[0] }}</b
          >...
        </span>
        <div v-else class="loading-error">
          <div>Failed to get project completions:</div>
          <pre>{{ loadingError }}</pre>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { SearchResult } from '@/lib/createFuzzySearcher.ts'
import { find } from '@/lib/createFuzzySearcher.ts'
import { computed, ref, watch } from 'vue'

const emit = defineEmits<{
  menuClicked: []
  showAdvancedSearch: []
  selected: [searchResult: SearchResult]
  beforeClear: [payload: { shouldProceed: boolean }]
  cleared: []
}>()

const props = withDefaults(
  defineProps<{
    placeholder?: string
    showClearButton?: string
    query?: string
    delay?: number
  }>(),
  {
    placeholder: 'Type here',
    showClearButton: '',
    query: '',
    delay: 80,
  },
)

const currentSelectedIndex = ref(-1)
const showLoading = ref(false)
const loadingError = ref('')
const suggestions = ref<SearchResult[]>([])
const currentQuery = ref(props.query)
const pendingKeyToShow = ref(false)
const searchTimeoutId = ref<number>()

const hasActiveSuggestions = computed(() => suggestions.value.length > 0)
const shouldShowClearButton = computed(() => currentQuery.value || props.showClearButton)

watch(currentQuery, (query) => {
  if (searchTimeoutId.value) clearTimeout(searchTimeoutId.value)
  if (!query) {
    suggestions.value = []
    return
  }
  searchTimeoutId.value = window.setTimeout(() => performSearch(query), props.delay)
})

function hideSuggestions() {
  suggestions.value = []
  showLoading.value = false
  pendingKeyToShow.value = true
  currentQuery.value = ''
}

function pickSuggestion(searchResult: SearchResult) {
  currentQuery.value = searchResult.text
  hideSuggestions()
  emit('selected', searchResult)
}

function clearSearch() {
  const payload = { shouldProceed: true }
  emit('beforeClear', payload)
  if (!payload.shouldProceed) return
  currentQuery.value = ''
  emit('cleared')
}

async function performSearch(query: string) {
  loadingError.value = ''
  showLoading.value = true
  try {
    const results = await find(query)
    showLoading.value = false
    if (!results) {
      suggestions.value = []
      return
    }
    suggestions.value = results.map((result) => ({ ...result, selected: false }))
    const hasResults = results.length > 0
    currentSelectedIndex.value = hasResults ? 0 : -1
    if (hasResults) suggestions.value[0].selected = true
  } catch (error) {
    showLoading.value = false
    loadingError.value = error instanceof Error ? error.message : 'Unknown error'
  }
}

function navigateSuggestions(event: KeyboardEvent, direction: number) {
  if (!hasActiveSuggestions.value) return
  event.preventDefault()
  if (currentSelectedIndex.value >= 0) {
    suggestions.value[currentSelectedIndex.value].selected = false
  }

  const modulo = (currentSelectedIndex.value + direction) % suggestions.value.length
  const newIndex = modulo < 0 ? modulo + suggestions.value.length : modulo

  suggestions.value[newIndex].selected = true
  currentSelectedIndex.value = newIndex
}

function handleKeydown(event: KeyboardEvent) {
  pendingKeyToShow.value = false
  switch (event.key) {
    case 'ArrowUp': {
      navigateSuggestions(event, -1)
      return
    }
    case 'ArrowDown': {
      navigateSuggestions(event, 1)
      return
    }
    case 'Enter': {
      handleEnterKey(event)
      return
    }
    case 'Escape': {
      hideSuggestions()
      return
    }
    default:
      return
  }
}

function handleEnterKey(event: KeyboardEvent) {
  event.preventDefault()
  pickSuggestion(
    suggestions.value[currentSelectedIndex.value] || {
      text: currentQuery.value,
      selected: false,
      skipAnimation: false,
      html: null,
      lat: 0,
      lon: 0,
      id: 0,
      year: '0',
    },
  )
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
