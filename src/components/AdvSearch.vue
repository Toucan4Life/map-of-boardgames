<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import CustomMinMaxSlider from './CustomMinMaxSlider.vue'
import BaseButton from './base/BaseButton.vue'
import BaseCard from './base/BaseCard.vue'
import BaseChip from './base/BaseChip.vue'
import type { SearchResult } from '@/lib/createFuzzySearcher'
import { formatCompactCount, getShapeForWeight, getColorForRating } from '@/lib/gameVisuals'
import { useSortableResults } from '@/composables/useSortableResults'
import { usePagination } from '@/composables/usePagination'
import { useTagFilter } from '@/composables/useTagFilter'

const emit = defineEmits<{ close: []; search: [searchR: AdvSearchResult]; resultSelected: [result: SearchResult] }>()

const props = defineProps<{
  searchResults?: SearchResult[]
}>()

const isOpen = defineModel<boolean>('isOpen', { default: false })
const pageSize = 20
const isExpandedMobile = ref(false)
const resultsSection = ref<HTMLElement | null>(null)

const { sortBy, sortDirection, sortedResults, setSortBy } = useSortableResults(
  () => props.searchResults,
  () => { resetPage(); },
)
const { currentPage, totalResults, totalPages, paginatedResults, resetPage, nextPage, prevPage } = usePagination(() => sortedResults.value, pageSize)
const {
  selectedTags,
  tagSearchQuery,
  showTagDropdown,
  filteredTags,
  toggleTag,
  removeTag,
  getTagDisplayName,
  getTagVariant,
  getTagTypeLabel,
  openTagDropdown,
  closeTagDropdown,
} = useTagFilter()

// Helper function to check if we're on mobile
function isMobileView(): boolean {
  return window.innerWidth <= 640
}

// Watch for search results and auto-scroll to them on mobile
watch(
  () => props.searchResults,
  (newResults) => {
    if (newResults && newResults.length > 0 && isMobileView()) {
      void nextTick(() => {
        resultsSection.value?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    }
  },
)

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
  minNumRatings: number
  maxNumRatings: number
  minPlaytime: number
  maxPlaytime: number
  minPlayers: number
  maxPlayers: number
  playerChoice: number
  tags: string[] | undefined
  minYear: number
  maxYear: number
}

const yearscale = [0, 1, 1500, 1900, 1950, 1980, 1990, 2000, 2005, 2010, 2015, 2021, 2022, 2023, 2024, 2025, 2026]
const timescale = [0, 1, 5, 15, 30, 45, 60, 90, 120, 180, 240, 480, 960, 1800]
const numRatingsScale = [1, 10, 100, 1000, 10000, 150000]
const playersScale = [1, 2, 3, 4, 5, 6, 7, 8, 10, 15]

function search(
  minW: number,
  maxW: number,
  minR: number,
  maxR: number,
  minNumR: number,
  maxNumR: number,
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
    minNumRatings: numRatingsScale[minNumR],
    maxNumRatings: numRatingsScale[maxNumR],
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

// Reset pagination when a new search is issued
function handleSearch(...args: Parameters<typeof search>) {
  resetPage()
  search(...args)
}

const sliderMin = ref(1)
const sliderMax = ref(5)
const sliderMinR = ref(0)
const sliderMaxR = ref(10)
const sliderMinNumR = ref(0)
const sliderMaxNumR = ref(5)
const sliderMinP = ref(0)
const sliderMaxP = ref(13)
const sliderMinPl = ref(0)
const sliderMaxPl = ref(9)
const sliderMinY = ref(0)
const sliderMaxY = ref(16)
// reassigned in the template
// eslint-disable-next-line prefer-const
let playersChoice: string = '0'

function selectResult(result: SearchResult) {
  emit('resultSelected', result)
}
</script>

<template>
  <div v-if="isOpen" class="adv-search-container">
    <div :class="['adv-search-panel', { 'adv-search-panel--expanded': isExpandedMobile }]">
      <div class="panel-header">
        <div class="panel-title-group">
          <h2 class="panel-title">Advanced Search</h2>
          <p class="panel-subtitle">Filter games by multiple criteria</p>
        </div>
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
          <h3 class="slider-label">
            # Ratings: {{ formatCompactCount(numRatingsScale[sliderMinNumR]) }} - {{ formatCompactCount(numRatingsScale[sliderMaxNumR]) }}
          </h3>
          <CustomMinMaxSlider v-model:min-value="sliderMinNumR" v-model:max-value="sliderMaxNumR" :min="0" :max="5" />
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
              class="tag-chip-removable"
              @click="removeTag(tagId)"
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
              sliderMinNumR,
              sliderMaxNumR,
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
        <div v-if="searchResults && searchResults.length > 0" ref="resultsSection" class="search-results">
          <div class="results-header">
            <h3 class="results-title">Results ({{ totalResults }})</h3>
            <p v-if="totalResults >= 1000" class="results-limit-notice">
              ⚠️ Showing first 1,000 results only. Refine your search for more specific results.
            </p>
            <div class="sort-controls">
              <label class="sort-label">Sort by:</label>
              <div class="sort-buttons">
                <button :class="['sort-button', { active: sortBy === 'name' }]" type="button" @click="setSortBy('name')">
                  Name
                  <span v-if="sortBy === 'name'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </button>
                <button :class="['sort-button', { active: sortBy === 'year' }]" type="button" @click="setSortBy('year')">
                  Year
                  <span v-if="sortBy === 'year'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </button>
                <button :class="['sort-button', { active: sortBy === 'rating' }]" type="button" @click="setSortBy('rating')">
                  Rating
                  <span v-if="sortBy === 'rating'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </button>
                <button :class="['sort-button', { active: sortBy === 'complexity' }]" type="button" @click="setSortBy('complexity')">
                  Complexity
                  <span v-if="sortBy === 'complexity'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </button>
                <button :class="['sort-button', { active: sortBy === 'numRatings' }]" type="button" @click="setSortBy('numRatings')">
                  # Ratings
                  <span v-if="sortBy === 'numRatings'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </div>
            </div>
          </div>

          <ul class="results-list">
            <li v-for="result in paginatedResults" :key="result.id" class="result-item">
              <BaseCard elevation="sm" interactive>
                <a href="#" class="result-link" @click.prevent="selectResult(result)">
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

.panel-title-group {
  flex: 1;
}

.panel-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin: 0;
  color: var(--color-heading);
  line-height: var(--leading-tight);
}

.panel-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-soft);
  margin: var(--space-1) 0 0 0;
  line-height: var(--leading-snug);
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

.results-limit-notice {
  font-size: var(--text-xs);
  color: var(--color-warning);
  margin: var(--space-1) 0 0 0;
  padding: var(--space-2);
  background: var(--color-warning-soft, rgba(255, 193, 7, 0.1));
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-warning);
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
