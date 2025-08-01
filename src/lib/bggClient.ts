import { XMLParser } from 'fast-xml-parser'

const rawBGGUrl = 'https://boardgamegeek.com/xmlapi2'
export interface GameDetail {
  imageUrl: string
  rating: string
  description: string
  minPlayers: string
  maxPlayers: string
  recommendedPlayers: string
  bestPlayers: string
  minPlayTime: string
  maxPlayTime: string
  weight: string
  minAge: string
  recommendedAge: string
  yearPublished: string
}
const options = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
}
const parser = new XMLParser(options)

function decodeMixedMojibake(text: string) {
  return text
    .replace(/(?:&#\d+;)+/g, (match) => {
      // Check if this looks like UTF-8 encoded Japanese (or other multibyte chars)
      const entities = match.match(/&#(\d+);/g)
      const bytes = entities
        ? entities.map((entity) => {
            return parseInt(entity.slice(2, -1), 10)
          })
        : []

      try {
        // Try to decode as UTF-8
        const uint8Array = new Uint8Array(bytes)
        const decoder = new TextDecoder('utf-8', { fatal: true })
        const decoded = decoder.decode(uint8Array)

        // Check if the decoded text looks like valid characters
        if (decoded && !decoded.includes('\uFFFD') && decoded.length > 0) {
          return decoded
        }
      } catch {
        // If UTF-8 decoding fails, fall through to regular HTML entity decoding
      }

      // Fallback to regular HTML entity decoding for non-UTF-8 sequences
      const temp = document.createElement('div')
      temp.innerHTML = match
      return temp.textContent || temp.innerText || match
    })
    .replace(/&([a-zA-Z]+|#\d+);/g, (match) => {
      // Handle remaining HTML entities (like &mdash;, &#10;, etc.)
      const temp = document.createElement('div')
      temp.innerHTML = match
      return temp.textContent || temp.innerText || match
    })
}
export async function getGameInfo(thingId: string): Promise<GameDetail | undefined> {
  const response = await fetch(`${rawBGGUrl}/thing?id=${thingId}&stats=1`)
  if (response.ok) {
    const parsedResponse = await response.text()
    const p = parser.parse(parsedResponse)
    return {
      imageUrl: p.items.item.image,
      rating: parseFloat(p.items.item.statistics.ratings.average['@_value']).toFixed(1),
      description: decodeMixedMojibake(p.items.item.description).split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+/)[0],
      minPlayTime: p.items.item.minplaytime['@_value'],
      maxPlayTime: p.items.item.maxplaytime['@_value'],
      weight: parseFloat(p.items.item.statistics.ratings.averageweight['@_value']).toFixed(2),
      minAge: p.items.item.minage['@_value'],
      recommendedAge: p.items.item.poll
        .filter((t: Record<string, string>) => t['@_name'] == 'suggested_playerage')[0]
        .results.result.sort(function (a: Record<string, number>, b: Record<string, number>) {
          return b['@_numvotes'] - a['@_numvotes']
        })[0]['@_value'],
      minPlayers: p.items.item.minplayers['@_value'],
      maxPlayers: p.items.item.maxplayers['@_value'],
      recommendedPlayers:
        p.items.item['poll'].filter((t: Record<string, string>) => t['@_name'] == 'suggested_numplayers')[0]['@_totalvotes'] == '0'
          ? undefined
          : p.items.item['poll-summary'].result
              .filter((t: Record<string, string>) => t['@_name'] == 'recommmendedwith')[0]
              ['@_value'].match('Recommended with (.*?) players')[1],
      bestPlayers:
        p.items.item['poll'].filter((t: Record<string, string>) => t['@_name'] == 'suggested_numplayers')[0]['@_totalvotes'] == '0'
          ? undefined
          : p.items.item['poll-summary'].result
              .filter((t: Record<string, string>) => t['@_name'] == 'bestwith')[0]
              ['@_value'].match('Best with (.*?) players')[1],
      yearPublished: p.items.item.yearpublished['@_value'],
    }
  }
}
