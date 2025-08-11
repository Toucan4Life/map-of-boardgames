import fuzzysort from 'fuzzysort'
import config from './config.ts'
import dedupingFetch from './dedupingFetch.ts'

interface Word {
  name: string
  lat: number
  lon: number
  id: number
  year: string
}

export interface SearchResult {
  selected: boolean
  skipAnimation: boolean
  html: string | null
  text: string
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

    cache[key] = data.map(([name, lat, lon, id, year]) => ({
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

export const find = async (query: string): Promise<SearchResult[] | undefined> => {
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
  }))
}
