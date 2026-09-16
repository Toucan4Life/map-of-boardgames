import { ref, computed, onMounted } from 'vue'
import { fetchTagMappings, type TagMappings, type TagMapping } from '@/lib/tagMappings'

export type TagType = 'category' | 'mechanic' | 'family'

interface TagWithType extends TagMapping {
  type: TagType
}

const TAG_TYPE_LABELS: Record<TagType, string> = {
  category: 'Category',
  mechanic: 'Mechanic',
  family: 'Family',
}

const TAG_TYPE_VARIANTS: Record<TagType, 'primary' | 'accent' | 'success'> = {
  category: 'primary',
  mechanic: 'accent',
  family: 'success',
}

function parseTagKey(tagKey: string): { type: TagType; id: string } | null {
  const [type, ...rest] = tagKey.split('-')
  if (rest.length === 0 || !isTagType(type)) return null
  return { type, id: rest.join('-') } // ids may themselves contain dashes
}

function isTagType(value: string): value is TagType {
  return value in TAG_TYPE_LABELS
}

/** Manages the advanced-search tag filter: fetching tag mappings, selection state, and the search dropdown. */
export function useTagFilter() {
  const tagMappings = ref<TagMappings>({ categories: [], mechanics: [], families: [] })
  const selectedTags = ref<string[]>([])
  const tagSearchQuery = ref('')
  const showTagDropdown = ref(false)

  onMounted(async () => {
    tagMappings.value = await fetchTagMappings()
  })

  function tagsOfType(type: TagType): TagMapping[] {
    return { category: tagMappings.value.categories, mechanic: tagMappings.value.mechanics, family: tagMappings.value.families }[type]
  }

  function toggleTag(tagKey: string): void {
    const index = selectedTags.value.indexOf(tagKey)
    if (index > -1) {
      selectedTags.value.splice(index, 1)
    } else {
      selectedTags.value.push(tagKey)
    }
  }

  function removeTag(tagKey: string): void {
    const index = selectedTags.value.indexOf(tagKey)
    if (index > -1) selectedTags.value.splice(index, 1)
  }

  function getTagDisplayName(tagKey: string): string {
    const parsed = parseTagKey(tagKey)
    if (!parsed) return tagKey
    return tagsOfType(parsed.type).find((t) => t.id === parsed.id)?.name ?? parsed.id
  }

  function getTagVariant(tagKey: string): 'primary' | 'accent' | 'success' {
    const parsed = parseTagKey(tagKey)
    return parsed ? TAG_TYPE_VARIANTS[parsed.type] : 'success'
  }

  function getTagTypeLabel(type: TagType): string {
    return TAG_TYPE_LABELS[type]
  }

  function openTagDropdown(): void {
    showTagDropdown.value = true
    tagSearchQuery.value = ''
  }

  function closeTagDropdown(): void {
    showTagDropdown.value = false
    tagSearchQuery.value = ''
  }

  const filteredTags = computed(() => {
    const typeOrder: Record<TagType, number> = { category: 1, mechanic: 2, family: 3 }
    const allTags: TagWithType[] = (['category', 'mechanic', 'family'] as const).flatMap((type) =>
      tagsOfType(type).map((tag) => ({ ...tag, type })),
    )
    allTags.sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.name.localeCompare(b.name))

    const query = tagSearchQuery.value.trim().toLowerCase()
    return query ? allTags.filter((tag) => tag.name.toLowerCase().includes(query)) : allTags
  })

  return {
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
  }
}
