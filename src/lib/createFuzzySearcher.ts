import fuzzysort from 'fuzzysort'
import config from './config.ts'
import dedupingFetch from './dedupingFetch.ts'

const fetchedIndex = new Set()
const seenWords = new Set()
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
  words: Word[] = []
  lastPromise: Fuzzysort.CancelablePromise<Fuzzysort.KeyResults<Word>> | undefined
  lastQuery: string | undefined

  find(query: string): Promise<SearchResult[] | undefined> {
    if (this.lastPromise) {
      this.lastPromise.cancel()
    }
    this.lastQuery = query
    const cacheKey = query[0]
    // let isCancelled = false;
    if (!fetchedIndex.has(cacheKey)) {
      const p = dedupingFetch(new URL(`${config.namesEndpoint}/${cacheKey}.json`))
        .then((data: string[][]) => {
          data.forEach((word: string[]) => {
            if (!seenWords.has(word[0])) {
              this.words.push({ name: word[0], lat: +word[1], lon: +word[2], id: +word[3] })
              seenWords.add(word[0])
            }
          })
          fetchedIndex.add(cacheKey)
          if (/*isCancelled ||*/ this.lastQuery !== query) {
            return undefined // Nobody cares, but lets keep the index.
          }
          return this.find(query) // Try again, but now with the index.
        })
        .catch((err: unknown) => {
          if (err instanceof Error) {
            console.error('FuzzySearch: Failed to fetch index for ' + cacheKey + '; Err: ' + err.message)
          }
          return undefined
        })
      // p.cancel = () => {
      //   isCancelled = true;
      // };
      return p
    }

    this.lastPromise = fuzzysort.goAsync(query, this.words, { limit: 10, key: 'name' })

    return this.lastPromise.then((results) => {
      // if (isCancelled) return;
      return results.map((x) => ({
        html: fuzzysort.highlight(x, '<b>', '</b>'),
        text: x.target,
        lat: x.obj.lat,
        lon: x.obj.lon,
        id: x.obj.id,
        skipAnimation: false,
        selected: false,
      }))
    })
  }
}
