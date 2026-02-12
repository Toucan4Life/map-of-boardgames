import config from './config'

export interface TagMapping {
  id: string
  name: string
}

export interface TagMappings {
  categories: TagMapping[]
  mechanics: TagMapping[]
  families: TagMapping[]
}

let cachedMappings: TagMappings | null = null

/**
 * Parse CSV string into TagMapping array
 * Expected format: id,name
 */
function parseCSV(csvText: string): TagMapping[] {
  const lines = csvText.trim().split('\n')
  const mappings: TagMapping[] = []

  // Skip header row if it exists
  const startIndex = lines[0].toLowerCase().includes('id') ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV parsing - assumes no commas in values
    const [id, ...nameParts] = line.split(',')
    const name = nameParts.join(',').trim()

    if (id && name) {
      mappings.push({ id: id.trim(), name })
    }
  }

  return mappings
}

/**
 * Fetch and cache all tag mappings from the server
 */
export async function fetchTagMappings(): Promise<TagMappings> {
  if (cachedMappings) {
    return cachedMappings
  }

  try {
    const [categoriesRes, mechanicsRes, familiesRes] = await Promise.all([
      fetch(config.categorySource),
      fetch(config.mechanicsSource),
      fetch(config.familiesSource),
    ])

    if (!categoriesRes.ok || !mechanicsRes.ok || !familiesRes.ok) {
      throw new Error('Failed to fetch tag mappings')
    }

    const [categoriesText, mechanicsText, familiesText] = await Promise.all([categoriesRes.text(), mechanicsRes.text(), familiesRes.text()])

    cachedMappings = {
      categories: parseCSV(categoriesText),
      mechanics: parseCSV(mechanicsText),
      families: parseCSV(familiesText),
    }

    return cachedMappings
  } catch (error) {
    console.error('Error fetching tag mappings:', error)
    return {
      categories: [],
      mechanics: [],
      families: [],
    }
  }
}

/**
 * Get a tag name by its ID and type
 */
export function getTagName(mappings: TagMappings, type: 'category' | 'mechanic' | 'family', id: string): string {
  const typeMap = {
    category: mappings.categories,
    mechanic: mappings.mechanics,
    family: mappings.families,
  }

  const mapping = typeMap[type].find((m) => m.id === id)
  return mapping ? mapping.name : id
}

/**
 * Parse the tags attribute from vector tile node
 * Format: "category1,category2;mechanic1,mechanic2;family1,family2"
 */
export function parseNodeTags(tagsAttr: string): { categories: string[]; mechanics: string[]; families: string[] } {
  const parts = tagsAttr.split(';')
  return {
    categories: parts[0] ? parts[0].split(',').filter((id) => id.trim()) : [],
    mechanics: parts[1] ? parts[1].split(',').filter((id) => id.trim()) : [],
    families: parts[2] ? parts[2].split(',').filter((id) => id.trim()) : [],
  }
}
