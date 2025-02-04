import fuzzysort from 'fuzzysort'
import log from './log.ts'
import config from './config.ts'
import dedupingFetch from './dedupingFetch.ts'

const fetchedIndex = new Set()
const seenWords = new Set()
interface Word {
  name: string
  lat: string
  lon: string
  id: string
}
export interface SearchResult {
  skipAnimation: boolean
  html: string | null
  text: string
  lat: string
  lon: string
  id: string
}
export default function createFuzzySearcher(): { find: (query: string) => Promise<SearchResult[] | void> } {
  const words: Array<Word> = []
  let lastPromise: Fuzzysort.CancelablePromise<Fuzzysort.KeyResults<Word>>
  let lastQuery: string
  const api = {
    find,
  }

  return api

  function find(query: string): Promise<SearchResult[] | void> {
    if (lastPromise) {
      lastPromise.cancel()
    }
    lastQuery = query
    const cacheKey = query[0]
    // let isCancelled = false;
    if (!fetchedIndex.has(cacheKey)) {
      const p = dedupingFetch(new URL(`${config.namesEndpoint}/${cacheKey}.json`))
        .then((data: string[][]) => {
          data.forEach((word: Array<string>) => {
            if (!seenWords.has(word[0])) {
              words.push({ name: word[0], lat: word[1], lon: word[2], id: word[3] })
              seenWords.add(word[0])
            }
          })
          fetchedIndex.add(cacheKey)
          if (/*isCancelled ||*/ lastQuery !== query) {
            return // Nobody cares, but lets keep the index.
          }
          return find(query) // Try again, but now with the index.
        })
        .catch((err: unknown) => {
          log.error('FuzzySearch', 'Failed to fetch index for ' + cacheKey, err)
        })
      // p.cancel = () => {
      //   isCancelled = true;
      // };
      return p
    }

    lastPromise = fuzzysort.goAsync(query, words, { limit: 10, key: 'name' })

    return lastPromise.then((results) => {
      // if (isCancelled) return;
      return results.map((x) => ({
        html: fuzzysort.highlight(x, '<b>', '</b>'),
        text: x.target,
        lat: x.obj.lat,
        lon: x.obj.lon,
        id: x.obj.id,
      }))
    })
  }
}
