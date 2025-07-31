import fuzzysort from 'fuzzysort'
import config from './config.ts'
import dedupingFetch from './dedupingFetch.ts'

interface Word {
  name: string
  lat: number
  lon: number
  id: number
}

export interface SearchResult {
  selected: boolean
  skipAnimation: boolean
  html: string | null
  text: string
  lat: number
  lon: number
  id: number
}

export class FuzzySearcher {
  private words: Word[] = []
  private fetchedIndices = new Set<string>()
  private seenWords = new Set<string>()

  async find(query: string): Promise<SearchResult[] | undefined> {
    // Load index for first letter if not already loaded
    const indexKey = query[0]
    if (!this.fetchedIndices.has(indexKey)) {
      await this.loadIndex(indexKey)
    }
    // Perform fuzzy search
    const results = fuzzysort.go(query, this.words, {
      limit: 10,
      key: 'name',
    })
    return this.formatResults(results)
  }

  private async loadIndex(indexKey: string): Promise<void> {
    try {
      const url = new URL(`${config.namesEndpoint}/${indexKey}.json`)
      const data: string[][] = await dedupingFetch(url)

      this.addWordsToIndex(data)
      this.fetchedIndices.add(indexKey)
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to fetch index for ${indexKey}: ${error.message}`)
      }
    }
  }

  private addWordsToIndex(data: string[][]): void {
    data.forEach(([name, lat, lon, id]) => {
      if (!this.seenWords.has(name)) {
        this.words.push({
          name,
          lat: +lat,
          lon: +lon,
          id: +id,
        })
        this.seenWords.add(name)
      }
    })
  }

  private formatResults(results: Fuzzysort.KeyResults<Word>): SearchResult[] {
    return results.map((result) => ({
      html: result.highlight ? result.highlight('<b>', '</b>') : null,
      text: result.target,
      lat: result.obj.lat,
      lon: result.obj.lon,
      id: result.obj.id,
      skipAnimation: false,
      selected: false,
    }))
  }
}
