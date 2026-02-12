<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomMinMaxSlider from './CustomMinMaxSlider.vue'
import BaseButton from './base/BaseButton.vue'
import BaseCard from './base/BaseCard.vue'
import BaseChip from './base/BaseChip.vue'
import type { SearchResult } from '@/lib/createFuzzySearcher'
import { fetchTagMappings, type TagMappings, type TagMapping } from '@/lib/tagMappings'

const emit = defineEmits<{ close: []; search: [searchR: AdvSearchResult]; resultSelected: [result: SearchResult] }>()

const props = defineProps<{
  searchResults?: SearchResult[]
}>()

const isOpen = defineModel<boolean>('isOpen', { default: false })
const currentPage = ref(1)
const pageSize = 20
const isExpandedMobile = ref(false)
const sortBy = ref<'name' | 'year' | 'rating' | 'complexity' | 'numRatings'>('name')
const sortDirection = ref<'asc' | 'desc'>('asc')

function close(): void {
  isOpen.value = false
  isExpandedMobile.value = false
  emit('close')
}

function toggleMobileExpand(): void {
  isExpandedMobile.value = !isExpandedMobile.value
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
  pChoice: string,
  minYear: number,
  maxYear: number,
): void {
  emit('search', {
    minWeight: minW,
    maxWeight: maxW,
    minRating: minR,
    maxRating: maxR,
    minPlaytime: timescale[minP],
    maxPlaytime: timescale[maxP],
    minPlayers: playersScale[minPl],
    maxPlayers: playersScale[maxPl],
    playerChoice: parseInt(pChoice, 10),
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
const selectedTags = ref<string[]>([])
const tagMappings = ref<TagMappings>({ categories: [], mechanics: [], families: [] })
const tagSearchQuery = ref('')
const showTagDropdown = ref(false)
const yearscale = [0, 1, 1500, 1900, 1950, 1980, 1990, 2000, 2005, 2010, 2015, 2020, 2021, 2022, 2023, 2024, 2025]
const timescale = [0, 1, 5, 15, 30, 45, 60, 90, 120, 180, 240, 480, 960, 1800]
const playersScale = [1, 2, 3, 4, 5, 6, 7, 8, 10, 15]
// reassigned in the template
// eslint-disable-next-line prefer-const
let playersChoice: string = '0'

// Pagination computed properties
const totalResults = computed(() => props.searchResults?.length || 0)
const totalPages = computed(() => Math.ceil(totalResults.value / pageSize))

// Sorted results
const sortedResults = computed(() => {
  if (!props.searchResults) return []

  const results = [...props.searchResults]

  results.sort((a, b) => {
    let compareValue = 0

    switch (sortBy.value) {
      case 'name':
        compareValue = a.text.localeCompare(b.text)
        break
      case 'year':
        compareValue = Number(a.year || 0) - Number(b.year || 0)
        break
      case 'rating':
        compareValue = (a.rating || 0) - (b.rating || 0)
        break
      case 'complexity':
        compareValue = (a.weight || 0) - (b.weight || 0)
        break
      case 'numRatings':
        compareValue = (a.size || 0) - (b.size || 0)
        break
    }

    return sortDirection.value === 'asc' ? compareValue : -compareValue
  })

  return results
})

const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return sortedResults.value.slice(start, end)
})

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function goToPage(page: number) {
  currentPage.value = page
}

function selectResult(result: SearchResult, event: MouseEvent) {
  emit('resultSelected', result)
}

function getShapeForWeight(weight?: number): string {
  if (!weight) return 'circle'
  if (weight < 2) return 'circle'
  if (weight < 3) return 'triangle'
  if (weight < 4) return 'diamond'
  return 'star'
}

function getColorForRating(rating?: number): string {
  if (!rating) return 'var(--rating-1)'
  if (rating < 5.1) return 'var(--rating-1)'
  if (rating < 5.6) return 'var(--rating-2)'
  if (rating < 5.9) return 'var(--rating-3)'
  if (rating < 6.2) return 'var(--rating-4)'
  if (rating < 6.4) return 'var(--rating-5)'
  if (rating < 6.7) return 'var(--rating-6)'
  if (rating < 6.9) return 'var(--rating-7)'
  if (rating < 7.2) return 'var(--rating-8)'
  if (rating < 7.6) return 'var(--rating-9)'
  return 'var(--rating-10)'
}

// Reset pagination when results change
function handleSearch(...args: Parameters<typeof search>) {
  currentPage.value = 1
  search(...args)
}

function toggleSortDirection() {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

function setSortBy(criteria: 'name' | 'year' | 'rating' | 'complexity' | 'numRatings') {
  if (sortBy.value === criteria) {
    toggleSortDirection()
  } else {
    sortBy.value = criteria
    sortDirection.value = 'asc'
  }
  currentPage.value = 1
}

// Tag selection functions
onMounted(async () => {
  tagMappings.value = await fetchTagMappings()
})

function toggleTag(tagKey: string) {
  const index = selectedTags.value.indexOf(tagKey)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tagKey)
  }
}

function removeTag(tagKey: string) {
  const index = selectedTags.value.indexOf(tagKey)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  }
}

function parseTagKey(tagKey: string): { type: 'category' | 'mechanic' | 'family'; id: string } | null {
  const parts = tagKey.split('-')
  if (parts.length < 2) return null
  const type = parts[0] as 'category' | 'mechanic' | 'family'
  const id = parts.slice(1).join('-') // Handle IDs that might contain dashes
  return { type, id }
}

function getTagDisplayName(tagKey: string): string {
  const parsed = parseTagKey(tagKey)
  if (!parsed) return tagKey

  const { type, id } = parsed
  if (type === 'category') {
    const tag = tagMappings.value.categories.find((t) => t.id === id)
    return tag ? tag.name : id
  } else if (type === 'mechanic') {
    const tag = tagMappings.value.mechanics.find((t) => t.id === id)
    return tag ? tag.name : id
  } else if (type === 'family') {
    const tag = tagMappings.value.families.find((t) => t.id === id)
    return tag ? tag.name : id
  }
  return tagKey
}

function getTagVariant(tagKey: string): 'primary' | 'accent' | 'success' {
  const parsed = parseTagKey(tagKey)
  if (!parsed) return 'success'

  if (parsed.type === 'category') return 'primary'
  if (parsed.type === 'mechanic') return 'accent'
  return 'success'
}

function getTagType(tagId: string): 'category' | 'mechanic' | 'family' | null {
  if (tagMappings.value.categories.some((t) => t.id === tagId)) return 'category'
  if (tagMappings.value.mechanics.some((t) => t.id === tagId)) return 'mechanic'
  if (tagMappings.value.families.some((t) => t.id === tagId)) return 'family'
  return null
}

function getTagTypeLabel(type: 'category' | 'mechanic' | 'family'): string {
  const labels = {
    category: 'Category',
    mechanic: 'Mechanic',
    family: 'Family',
  }
  return labels[type]
}

function openTagDropdown() {
  showTagDropdown.value = true
  tagSearchQuery.value = ''
}

function closeTagDropdown() {
  showTagDropdown.value = false
  tagSearchQuery.value = ''
}

interface TagWithType extends TagMapping {
  type: 'category' | 'mechanic' | 'family'
}

const filteredTags = computed(() => {
  // Combine all tags with their types
  const allTags: TagWithType[] = [
    ...tagMappings.value.categories.map((tag) => ({ ...tag, type: 'category' as const })),
    ...tagMappings.value.mechanics.map((tag) => ({ ...tag, type: 'mechanic' as const })),
    ...tagMappings.value.families.map((tag) => ({ ...tag, type: 'family' as const })),
  ]

  // Sort by type first (category, mechanic, family), then alphabetically within each type
  const typeOrder = { category: 1, mechanic: 2, family: 3 }
  const sortedTags = allTags.sort((a, b) => {
    const typeComparison = typeOrder[a.type] - typeOrder[b.type]
    if (typeComparison !== 0) return typeComparison
    return a.name.localeCompare(b.name)
  })

  // Filter by search query if present
  if (!tagSearchQuery.value) {
    return sortedTags
  }

  const query = tagSearchQuery.value.toLowerCase()
  return sortedTags.filter((tag) => tag.name.toLowerCase().includes(query))
})
</script>

<template>
  <div v-if="isOpen" class="adv-search-container">
    <div :class="['adv-search-panel', { 'adv-search-panel--expanded': isExpandedMobile }]">
      <div class="panel-header">
        <h2 class="panel-title">Advanced Search</h2>
        <div class="header-buttons">
          <button
            class="expand-button"
            type="button"
            :aria-label="isExpandedMobile ? 'Minimize panel' : 'Expand panel'"
            @click.stop="toggleMobileExpand"
          >
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
              <polyline v-if="!isExpandedMobile" points="15 3 21 3 21 9" />
              <polyline v-if="!isExpandedMobile" points="9 21 3 21 3 15" />
              <line v-if="!isExpandedMobile" x1="21" y1="3" x2="14" y2="10" />
              <line v-if="!isExpandedMobile" x1="3" y1="21" x2="10" y2="14" />
              <polyline v-if="isExpandedMobile" points="4 14 10 14 10 20" />
              <polyline v-if="isExpandedMobile" points="20 10 14 10 14 4" />
              <line v-if="isExpandedMobile" x1="14" y1="10" x2="21" y2="3" />
              <line v-if="isExpandedMobile" x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
          <button class="close-button" type="button" aria-label="Close advanced search" @click="close">
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
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="panel-content">
        <div class="slider-cont">
          <h3 class="slider-label">Year Published: {{ yearscale[sliderMinY] }} - {{ yearscale[sliderMaxY] }}</h3>
          <CustomMinMaxSlider v-model:min-value="sliderMinY" v-model:max-value="sliderMaxY" :min="0" :max="16" />
        </div>
        <div class="slider-cont">
          <h3 class="slider-label">Game rating: {{ sliderMinR }} - {{ sliderMaxR }}</h3>
          <CustomMinMaxSlider v-model:min-value="sliderMinR" v-model:max-value="sliderMaxR" :min="0" :max="10" :step="0.1" />
        </div>
        <div class="slider-cont">
          <h3 class="slider-label">Game complexity: {{ sliderMin }} - {{ sliderMax }}</h3>
          <CustomMinMaxSlider v-model:min-value="sliderMin" v-model:max-value="sliderMax" :min="1" :max="5" :step="0.1" />
        </div>
        <div class="slider-cont">
          <h3 class="slider-label">Player count: {{ playersScale[sliderMinPl] }} - {{ playersScale[sliderMaxPl] }}</h3>
          <div class="segmented-control">
            <input id="radio1" v-model="playersChoice" name="segmented" type="radio" value="0" checked />
            <label for="radio1">Theoretical</label>
            <input id="radio2" v-model="playersChoice" name="segmented" type="radio" value="1" />
            <label for="radio2">Recommended</label>
            <input id="radio3" v-model="playersChoice" name="segmented" type="radio" value="2" />
            <label for="radio3">Best</label>
          </div>
          <CustomMinMaxSlider v-model:min-value="sliderMinPl" v-model:max-value="sliderMaxPl" :min="0" :max="9" />
        </div>
        <div class="slider-cont">
          <h3 class="slider-label">Game length (min): {{ timescale[sliderMinP] }} - {{ timescale[sliderMaxP] }}</h3>
          <CustomMinMaxSlider v-model:min-value="sliderMinP" v-model:max-value="sliderMaxP" :min="0" :max="13" />
        </div>

        <!-- Tags Selection -->
        <div class="tags-selector-container">
          <h3 class="slider-label">Filter by Tags</h3>

          <!-- Selected Tags Display -->
          <div v-if="selectedTags.length > 0" class="selected-tags">
            <BaseChip
              v-for="tagId in selectedTags"
              :key="tagId"
              :variant="getTagVariant(tagId)"
              size="sm"
              @click="removeTag(tagId)"
              class="tag-chip-removable"
            >
              {{ getTagDisplayName(tagId) }}
              <span class="tag-remove">×</span>
            </BaseChip>
          </div>

          <!-- Unified Tag Search Input -->
          <div class="tag-search-container">
            <input
              v-model="tagSearchQuery"
              type="text"
              class="tag-search-input-main"
              placeholder="Search tags (categories, mechanics, families)..."
              @focus="openTagDropdown"
              @click.stop
            />
          </div>

          <!-- Tag Dropdown -->
          <div v-if="showTagDropdown" class="tag-dropdown-overlay" @click="closeTagDropdown">
            <div class="tag-dropdown" @click.stop>
              <div class="tag-dropdown-header">
                <h4 class="tag-dropdown-title">Select Tags</h4>
                <button class="tag-dropdown-close" @click="closeTagDropdown">×</button>
              </div>
              <div class="tag-dropdown-list">
                <button
                  v-for="tag in filteredTags"
                  :key="`${tag.type}-${tag.id}`"
                  class="tag-dropdown-item"
                  :class="{ selected: selectedTags.includes(`${tag.type}-${tag.id}`) }"
                  @click="toggleTag(`${tag.type}-${tag.id}`)"
                >
                  <span class="tag-checkbox">{{ selectedTags.includes(`${tag.type}-${tag.id}`) ? '✓' : '' }}</span>
                  <span class="tag-item-content">
                    <span class="tag-name">{{ tag.name }}</span>
                    <span class="tag-type-badge" :data-type="tag.type">{{ getTagTypeLabel(tag.type) }}</span>
                  </span>
                </button>
              </div>
              <div class="tag-dropdown-footer">
                <BaseButton variant="primary" size="sm" @click="closeTagDropdown"> Done </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <BaseButton
          variant="primary"
          size="md"
          full-width
          @click="
            handleSearch(
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
        >
          Search
        </BaseButton>

        <!-- Search Results -->
        <div v-if="searchResults && searchResults.length > 0" class="search-results">
          <div class="results-header">
            <h3 class="results-title">Results ({{ totalResults }})</h3>
            <div class="sort-controls">
              <label class="sort-label">Sort by:</label>
              <div class="sort-buttons">
                <button :class="['sort-button', { active: sortBy === 'name' }]" @click="setSortBy('name')" type="button">
                  Name
                  <span v-if="sortBy === 'name'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </button>
                <button :class="['sort-button', { active: sortBy === 'year' }]" @click="setSortBy('year')" type="button">
                  Year
                  <span v-if="sortBy === 'year'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </button>
                <button :class="['sort-button', { active: sortBy === 'rating' }]" @click="setSortBy('rating')" type="button">
                  Rating
                  <span v-if="sortBy === 'rating'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </button>
                <button :class="['sort-button', { active: sortBy === 'complexity' }]" @click="setSortBy('complexity')" type="button">
                  Complexity
                  <span v-if="sortBy === 'complexity'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </button>
                <button :class="['sort-button', { active: sortBy === 'numRatings' }]" @click="setSortBy('numRatings')" type="button">
                  # Ratings
                  <span v-if="sortBy === 'numRatings'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </div>
            </div>
          </div>

          <ul class="results-list">
            <li v-for="result in paginatedResults" :key="result.id" class="result-item">
              <BaseCard elevation="sm" interactive>
                <a href="#" class="result-link" @click.prevent="selectResult(result, $event)">
                  {{ result.text }}
                  <span class="result-meta">
                    <span v-if="result.year && result.year !== '0'" class="result-year">({{ result.year }})</span>
                    <svg v-if="result.rating || result.weight" class="badge-icon" width="16" height="16" viewBox="0 0 24 24">
                      <circle v-if="getShapeForWeight(result.weight) === 'circle'" cx="12" cy="12" r="10" :fill="getColorForRating(result.rating)" />
                      <polygon
                        v-if="getShapeForWeight(result.weight) === 'triangle'"
                        points="12,2 22,20 2,20"
                        :fill="getColorForRating(result.rating)"
                      />
                      <polygon
                        v-if="getShapeForWeight(result.weight) === 'diamond'"
                        points="12,2 22,12 12,22 2,12"
                        :fill="getColorForRating(result.rating)"
                      />
                      <polygon
                        v-if="getShapeForWeight(result.weight) === 'star'"
                        points="12,2 14,9 22,9 16,13 18,21 12,16 6,21 8,13 2,9 10,9"
                        :fill="getColorForRating(result.rating)"
                      />
                    </svg>
                  </span>
                </a>
              </BaseCard>
            </li>
          </ul>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="pagination">
            <button class="pagination-button" :disabled="currentPage === 1" @click="prevPage">← Previous</button>
            <div class="pagination-info">Page {{ currentPage }} of {{ totalPages }}</div>
            <button class="pagination-button" :disabled="currentPage === totalPages" @click="nextPage">Next →</button>
          </div>
        </div>

        <div v-else-if="searchResults && searchResults.length === 0" class="no-results">No games found matching your criteria.</div>
      </div>
    </div>
  </div>
</template>
<style src="vue-multiselect/dist/vue-multiselect.css"></style>
<style scoped>
/* ==========================================
   ADVANCED SEARCH PANEL
   ========================================== */
.adv-search-container {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-popover);
  pointer-events: none;
}

.adv-search-panel {
  position: relative;
  width: var(--sidebar-width);
  height: 100%;
  background: var(--color-background);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-border);
  animation: slideInRight var(--duration-normal) var(--ease-out);
  pointer-events: auto;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

/* Panel Header */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.panel-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin: 0;
  color: var(--color-heading);
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  color: var(--color-link);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.close-button:hover {
  background: var(--color-surface-hover);
  color: var(--color-link-hover);
}

.close-button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.header-buttons {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.expand-button {
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  color: var(--color-link);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.expand-button:hover {
  background: var(--color-surface-hover);
  color: var(--color-link-hover);
}

.expand-button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Panel Content - Scrollable Area */
.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: var(--space-4);
}

/* Panel Footer */
.panel-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* ==========================================
   SLIDER CONTAINERS
   ========================================== */
.slider-cont {
  margin-bottom: var(--space-3);
}

.slider-label {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  margin: 0 0 var(--space-1) 0;
  color: var(--color-text);
}

/* ==========================================
   SEGMENTED CONTROL
   ========================================== */
.segmented-control {
  display: inline-flex;
  margin-bottom: var(--space-3);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.segmented-control input[type='radio'] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.segmented-control label {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 2px solid var(--color-border-strong);
  border-right: none;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  user-select: none;
}

.segmented-control label:first-of-type {
  border-top-left-radius: var(--radius-md);
  border-bottom-left-radius: var(--radius-md);
}

.segmented-control label:last-of-type {
  border-top-right-radius: var(--radius-md);
  border-bottom-right-radius: var(--radius-md);
  border-right: 2px solid var(--color-border-strong);
}

.segmented-control label:hover {
  background: var(--color-surface-hover);
}

.segmented-control input:checked + label {
  background: var(--color-link);
  color: white;
  border-color: var(--color-link);
  cursor: default;
}

.segmented-control input:checked + label:hover {
  background: var(--color-link-hover);
}

/* Fix border overlap when checked */
.segmented-control input:checked + label + input + label {
  border-left-color: var(--color-link);
}

/* ==========================================
   MULTISELECT (LEGACY)
   ========================================== */
.custom__tag {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  background: var(--color-accent-soft);
  margin-right: var(--space-2);
  margin-bottom: var(--space-2);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
}

.custom__tag:hover {
  background: var(--color-surface-hover);
}

.custom__remove {
  padding: 0;
  font-size: var(--text-xs);
  margin-left: var(--space-1);
}

/* ==========================================
   TAGS SELECTOR
   ========================================== */
.tags-selector-container {
  margin-bottom: var(--space-3);
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  padding: var(--space-2);
  background: var(--color-surface-soft);
  border-radius: var(--radius-md);
  min-height: 44px;
  align-items: center;
}

.tag-chip-removable {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  transition: opacity var(--duration-fast) var(--ease-out);
}

.tag-chip-removable:hover {
  opacity: 0.8;
}

.tag-remove {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  line-height: 1;
  margin-left: var(--space-1);
}

.tag-type-buttons {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.tag-search-container {
  margin-bottom: var(--space-2);
}

.tag-search-input-main {
  width: 100%;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  font-size: var(--text-sm);
  color: var(--color-text);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.tag-search-input-main:focus {
  border-color: var(--color-link);
}

.tag-search-input-main::placeholder {
  color: var(--color-text-soft);
}

.tag-dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-4);
}

.tag-dropdown {
  background: var(--color-background);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2xl);
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.tag-dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.tag-dropdown-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin: 0;
  color: var(--color-heading);
}

.tag-dropdown-close {
  background: transparent;
  border: none;
  color: var(--color-text-soft);
  font-size: var(--text-2xl);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--ease-out);
}

.tag-dropdown-close:hover {
  background: var(--color-surface-hover);
}

.tag-search-input {
  width: 100%;
  padding: var(--space-3);
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-soft);
  font-size: var(--text-sm);
  color: var(--color-text);
  outline: none;
}

.tag-search-input:focus {
  border-bottom-color: var(--color-link);
}

.tag-dropdown-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.tag-dropdown-item {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  text-align: left;
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  transition: background-color var(--duration-fast) var(--ease-out);
}

.tag-dropdown-item:hover {
  background: var(--color-surface-hover);
}

.tag-dropdown-item.selected {
  background: var(--color-link-soft);
  color: var(--color-link);
}

.tag-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: var(--space-2);
}

.tag-name {
  flex: 1;
}

.tag-type-badge {
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
  white-space: nowrap;
}

.tag-type-badge[data-type='category'] {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.tag-type-badge[data-type='mechanic'] {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.tag-type-badge[data-type='family'] {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.tag-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  transition: all var(--duration-fast) var(--ease-out);
}

.tag-dropdown-item.selected .tag-checkbox {
  border-color: var(--color-link);
  background: var(--color-link);
  color: white;
}

.tag-dropdown-footer {
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}

/* ==========================================
   SEARCH RESULTS
   ========================================== */
.search-results {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.results-header {
  margin-bottom: var(--space-3);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.results-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0;
  color: var(--color-text);
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.sort-label {
  font-size: var(--text-xs);
  color: var(--color-text-soft);
  font-weight: var(--font-medium);
}

.sort-buttons {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.sort-button {
  padding: var(--space-1) var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.sort-button:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-link);
}

.sort-button.active {
  background: var(--color-link);
  color: white;
  border-color: var(--color-link);
}

.sort-button.active:hover {
  background: var(--color-link-hover);
  border-color: var(--color-link-hover);
}

.sort-arrow {
  font-size: var(--text-sm);
  line-height: 1;
}

.results-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.result-item {
  transition: transform var(--duration-fast) var(--ease-out);
}

.result-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  text-decoration: none;
  color: var(--color-heading);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: color var(--duration-fast) var(--ease-out);
}

.result-link:hover {
  color: var(--color-link-hover);
}

.result-year {
  font-size: var(--text-xs);
  color: var(--color-text-soft);
}

.result-meta {
  font-size: var(--text-xs);
  color: var(--color-text-soft);
  margin-left: var(--space-2);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.badge-icon {
  flex-shrink: 0;
  pointer-events: none;
  vertical-align: middle;
}

.no-results {
  margin-top: var(--space-4);
  padding: var(--space-3);
  text-align: center;
  color: var(--color-text-soft);
  font-size: var(--text-sm);
  background: var(--color-surface-soft);
  border-radius: var(--radius-md);
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.pagination-button {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.pagination-button:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: var(--color-link);
  color: var(--color-link);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

/* ==========================================
   RESPONSIVE - TABLET
   ========================================== */
@media (max-width: 768px) {
  .adv-search-panel {
    width: 45vw;
  }
}

/* ==========================================
   RESPONSIVE - MOBILE
   ========================================== */
@media (max-width: 640px) {
  .adv-search-container {
    top: auto;
    bottom: 0;
    left: 0;
  }

  .adv-search-panel {
    width: 100%;
    height: 40vh;
    max-height: 40vh;
    border-left: none;
    border-top: 1px solid var(--color-border);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    box-shadow: var(--shadow-2xl);
    animation: slideInBottom var(--duration-normal) var(--ease-out);
    transition:
      height var(--duration-normal) var(--ease-out),
      max-height var(--duration-normal) var(--ease-out);
  }

  .adv-search-panel--expanded {
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .expand-button {
    display: flex;
  }

  @keyframes slideInBottom {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .panel-header {
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }

  .panel-title {
    font-size: var(--text-xs);
  }

  .expand-button {
    width: 32px;
    height: 32px;
  }

  .expand-button svg {
    width: 16px;
    height: 16px;
  }

  .close-button {
    width: 32px;
    height: 32px;
  }

  .close-button svg {
    width: 16px;
    height: 16px;
  }

  .panel-content {
    padding: var(--space-2);
  }

  .panel-footer {
    padding: var(--space-3);
  }

  .slider-label {
    font-size: var(--text-sm);
  }

  .results-list {
    min-height: 150px;
  }

  .result-link {
    padding: var(--space-2);
    font-size: var(--text-xs);
  }

  .pagination-button,
  .pagination-info {
    font-size: var(--text-xs);
  }

  .pagination-button {
    padding: var(--space-1) var(--space-2);
  }
}
</style>
