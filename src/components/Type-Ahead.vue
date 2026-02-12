<template>
  <div v-click-outside="hideSuggestions" class="typeahead">
    <BaseIconButton variant="ghost" size="md" ariaLabel="About this app" title="About" @click="emit('menuClicked')">
      <svg
        xmlns="http://www.w3.org/2000/svg"
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
    </BaseIconButton>

    <BaseIconButton variant="ghost" size="md" ariaLabel="Advanced search filters" title="Advanced Filters" @click="emit('showAdvancedSearch')">
      <svg fill="currentColor" viewBox="0 0 300.906 300.906" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M288.953,0h-277c-5.522,0-10,4.478-10,10v49.531c0,5.522,4.478,10,10,10h12.372l91.378,107.397v113.978c0,3.688,2.03,7.076,5.281,8.816
             c1.479,0.792,3.101,1.184,4.718,1.184c1.94,0,3.875-0.564,5.548-1.68l49.5-33c2.782-1.854,4.453-4.977,4.453-8.32v-80.978
             l91.378-107.397h12.372c5.522,0,10-4.478,10-10V10C298.953,4.478,294.476,0,288.953,0z M167.587,166.77
             c-1.539,1.809-2.384,4.105-2.384,6.48v79.305l-29.5,19.666V173.25c0-2.375-0.845-4.672-2.384-6.48L50.585,69.531h199.736
             L167.587,166.77z M278.953,49.531h-257V20h257V49.531z"
        />
      </svg>
    </BaseIconButton>

    <div class="typeahead__input-wrapper">
      <svg
        class="typeahead__search-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
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
        :aria-label="placeholder"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="suggestions.length > 0"
        :aria-activedescendant="currentSelectedIndex >= 0 ? `suggestion-${currentSelectedIndex}` : undefined"
        aria-controls="suggestions-list"
        @keydown="handleKeydown"
      />
    </div>

    <BaseIconButton
      v-if="shouldShowClearButton"
      variant="ghost"
      size="md"
      ariaLabel="Clear search"
      title="Clear"
      class="typeahead__clear"
      @click="clearSearch"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
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
    </BaseIconButton>

    <ul
      v-if="suggestions.length"
      id="suggestions-list"
      class="typeahead__suggestions"
      role="listbox"
      :aria-label="`${suggestions.length} games found`"
    >
      <li v-for="(s, i) in suggestions" :key="i" role="option" :id="`suggestion-${i}`" :aria-selected="s.selected">
        <a class="typeahead__suggestion" :class="{ 'typeahead__suggestion--selected': s.selected }" href="#" @click.prevent="selectSuggestion(s)">
          {{ `${s.text} (${s.year})` }}
        </a>
      </li>
    </ul>

    <div v-if="showLoading" class="typeahead__loading" role="status" aria-live="polite">
      <div v-if="!loadingError" class="typeahead__loading-text">
        Downloading search index for letter <strong>{{ currentQuery[0] }}</strong
        >...
      </div>
      <div v-else class="typeahead__error">
        <div>Failed to get game completions:</div>
        <pre>{{ loadingError }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import fuzzysort from 'fuzzysort'
import dedupingFetch from '@/lib/dedupingFetch'
import config from '@/lib/config'
import type { SearchResult } from '@/lib/createFuzzySearcher'
import BaseIconButton from './base/BaseIconButton.vue'

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

const currentQuery = ref(props.query)

const suggestions = ref<SearchResult[]>([])
const showLoading = ref(false)
const loadingError = ref('')
const currentSelectedIndex = ref(-1)

const shouldShowClearButton = computed(() => currentQuery.value.trim().length > 0)
let searchTimeoutId: number | undefined
const skipNextSearch = ref(false)
watch(
  () => props.query,
  (newQuery) => {
    skipNextSearch.value = true
    currentQuery.value = newQuery
  },
)
watch(currentQuery, (query) => {
  if (skipNextSearch.value) {
    skipNextSearch.value = false
    return
  }
  if (searchTimeoutId) clearTimeout(searchTimeoutId)
  if (!query) {
    suggestions.value = []
    return
  }
  searchTimeoutId = window.setTimeout(() => performSearch(query), props.delay)
})

function hideSuggestions() {
  suggestions.value = []
  showLoading.value = false
}

function selectSuggestion(searchResult: SearchResult) {
  skipNextSearch.value = true
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
    suggestions.value = (results || []).map((r, idx) => ({ ...r, selected: idx === 0 }))
    currentSelectedIndex.value = suggestions.value.length ? 0 : -1
  } catch (err) {
    showLoading.value = false
    loadingError.value = err instanceof Error ? err.message : 'Unknown error'
  }
}
interface Word {
  name: string
  lat: number
  lon: number
  id: number
  year: string
}

const cache: Record<string, Word[]> = {}
const loadIndex = async (key: string): Promise<Word[]> => {
  if (key in cache) return cache[key]

  try {
    const url = new URL(`${config.namesEndpoint}/${key}.json`)
    const data: string[][] = await dedupingFetch(url)

    cache[key] = data.map(([name, lon, lat, id, year]) => ({
      name,
      lat: +lat,
      lon: +lon,
      id: +id,
      year,
    }))
  } catch (error) {
    console.error(`Failed to load index ${key}:`, error)
    cache[key] = []
  }

  return cache[key]
}

const find = async (query: string): Promise<SearchResult[] | undefined> => {
  if (!query) return undefined

  const firstChar = query[0]
  const key = firstChar >= 'A' && firstChar <= 'Z' ? firstChar.toLowerCase() : firstChar
  const words = await loadIndex(key)

  return fuzzysort.go(query, words, { limit: 10, key: 'name' }).map((r) => ({
    html: r.highlight('<b>', '</b>'),
    text: r.target,
    lat: r.obj.lat,
    lon: r.obj.lon,
    id: r.obj.id,
    selected: false,
    skipAnimation: false,
    year: r.obj.year,
    groupId: undefined,
  }))
}
function navigateSuggestions(event: KeyboardEvent, direction: number) {
  if (!suggestions.value.length) return
  event.preventDefault()
  suggestions.value[currentSelectedIndex.value].selected = false
  currentSelectedIndex.value = (currentSelectedIndex.value + direction + suggestions.value.length) % suggestions.value.length
  suggestions.value[currentSelectedIndex.value].selected = true
}

function handleKeydown(event: KeyboardEvent) {
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
      event.preventDefault()
      if (currentSelectedIndex.value >= 0) {
        selectSuggestion(suggestions.value[currentSelectedIndex.value])
      }
      return
    }
    case 'Escape': {
      hideSuggestions()
      return
    }
  }
}
</script>

<style scoped>
/* ==========================================
   TYPEAHEAD COMPONENT
   ========================================== */
.typeahead {
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  background: var(--color-background-soft);
  border-radius: var(--radius-md);
  overflow: visible;
  position: relative;
}

.typeahead__clear {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
}

/* Icon buttons - Link color for discoverability */
.typeahead :deep(.base-icon-button) {
  color: var(--color-link);
}

.typeahead :deep(.base-icon-button:hover:not(:disabled)) {
  color: var(--color-link-hover);
}

/* ==========================================
   INPUT
   ========================================== */
.typeahead__input-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
}

.typeahead__search-icon {
  position: absolute;
  left: var(--space-3);
  width: 20px;
  height: 20px;
  color: var(--color-text-mute);
  pointer-events: none;
  z-index: 1;
}

input[type='text'] {
  height: 100%;
  width: 100%;
  padding: 0 calc(var(--touch-target-min) + var(--space-2)) 0 calc(var(--space-3) + 20px + var(--space-2));
  font-size: var(--text-lg);
  border: 0;
  border-radius: 0;
  background: var(--color-background-soft);
  color: var(--color-text);
  font-family: var(--font-family-base);
  transition: background-color var(--duration-fast) var(--ease-out);
}

input[type='text']:hover {
  background: var(--color-background-mute);
}

input[type='text']:focus {
  outline: none;
  background: var(--color-background-mute);
}

input[type='text']::placeholder {
  color: var(--color-text-mute);
}

/* ==========================================
   SUGGESTIONS DROPDOWN
   ========================================== */
.typeahead__suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  padding: 0;
  margin: 0;
  background: var(--color-background-elevated);
  list-style-type: none;
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: 400px;
  overflow-y: auto;
  z-index: var(--z-dropdown);
}

.typeahead__suggestion {
  display: block;
  width: 100%;
  min-height: 40px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  text-decoration: none;
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  color: var(--color-text);
  transition: background-color var(--duration-fast) var(--ease-out);
}

.typeahead__suggestion:hover,
.typeahead__suggestion--selected {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

/* Highlight matched text */
.typeahead__suggestion :deep(b) {
  font-weight: var(--font-bold);
  color: var(--color-link);
}

/* ==========================================
   LOADING STATE
   ========================================== */
.typeahead__loading {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: var(--color-background-elevated);
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-dropdown);
}

.typeahead__loading-text {
  padding: var(--space-3);
  font-size: var(--text-base);
  color: var(--color-text-soft);
}

.typeahead__loading-text strong {
  font-weight: var(--font-bold);
  color: var(--color-text);
}

.typeahead__error {
  padding: var(--space-3);
  color: var(--error-500);
}

.typeahead__error pre {
  margin-top: var(--space-2);
  padding: var(--space-2);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  overflow-x: auto;
  font-size: var(--text-sm);
  color: var(--error-600);
}

/* ==========================================
   RESPONSIVE - MOBILE
   ========================================== */
@media (max-width: 640px) {
  .typeahead {
    border-radius: 0;
  }

  .typeahead__suggestion {
    min-height: var(--touch-target-min);
    padding: var(--space-3);
    font-size: var(--text-md);
  }

  input[type='text'] {
    font-size: var(--text-md);
  }

  .typeahead__suggestions {
    border-radius: 0;
  }
}
</style>
