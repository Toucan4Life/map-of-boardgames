import { XMLParser } from 'fast-xml-parser'

const rawBGGUrl = 'https://boardgamegeek.com/xmlapi2'
export interface GameDetail {
  imageUrl: string
  rating: string
  description: string
  minPlayers: string
  maxPlayers: string
  recommendedPlayers: string | undefined
  bestPlayers: string | undefined
  minPlayTime: string
  maxPlayTime: string
  weight: string
  minAge: string
  recommendedAge: string
  yearPublished: string
}
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

function decodeMixedMojibake(text: string) {
  return text
    .replace(/(?:&#\d+;)+/g, (match) => {
      const entities = match.match(/&#(\d+);/g) || []
      const bytes = entities.map((e) => parseInt(e.slice(2, -1), 10))
      try {
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
        if (decoded && !decoded.includes('\uFFFD')) return decoded
      } catch {
        // fall back
      }
      const temp = document.createElement('div')
      temp.innerHTML = match
      return temp.textContent || temp.innerText || match
    })
    .replace(/&([a-zA-Z]+|#\d+);/g, (match) => {
      const temp = document.createElement('div')
      temp.innerHTML = match
      return temp.textContent || temp.innerText || match
    })
}

export async function getGameInfo(thingId: string): Promise<GameDetail | undefined> {
  const res = await fetch(`${rawBGGUrl}/thing?id=${thingId}&stats=1`)
  if (!res.ok) return

  const xml = await res.text()
  const p = parser.parse(xml)
  const item = p.items?.item
  if (!item) return

  const poll = item.poll ?? []
  const suggestedAgePoll = poll.find((t: { [x: string]: string }) => t['@_name'] === 'suggested_playerage')
  const recommendedAge =
    suggestedAgePoll?.results?.result.sort((a: { [x: string]: number }, b: { [x: string]: number }) => b['@_numvotes'] - a['@_numvotes'])[0]?.[
      '@_value'
    ] ?? ''

  const suggestedNumPlayersPoll = poll.find((t: { [x: string]: string }) => t['@_name'] === 'suggested_numplayers')
  const noVotes = suggestedNumPlayersPoll?.['@_totalvotes'] === '0'

  // poll-summary is sometimes undefined, so safe check
  const pollSummary = item['poll-summary']?.result ?? []

  const recommendedPlayers = noVotes
    ? undefined
    : pollSummary.find((r: { [x: string]: string }) => r['@_name'] === 'recommmendedwith')?.['@_value'].match(/Recommended with (.*?) players/)?.[1]

  const bestPlayers = noVotes
    ? undefined
    : pollSummary.find((r: { [x: string]: string }) => r['@_name'] === 'bestwith')?.['@_value'].match(/Best with (.*?) players/)?.[1]

  return {
    imageUrl: item.image ?? '',
    rating: parseFloat(item.statistics?.ratings?.average?.['@_value'] ?? '0').toFixed(1),
    description: decodeMixedMojibake(item.description ?? '').split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+/)[0],
    minPlayTime: item.minplaytime?.['@_value'] ?? '',
    maxPlayTime: item.maxplaytime?.['@_value'] ?? '',
    weight: parseFloat(item.statistics?.ratings?.averageweight?.['@_value'] ?? '0').toFixed(2),
    minAge: item.minage?.['@_value'] ?? '',
    recommendedAge,
    minPlayers: item.minplayers?.['@_value'] ?? '',
    maxPlayers: item.maxplayers?.['@_value'] ?? '',
    recommendedPlayers,
    bestPlayers,
    yearPublished: item.yearpublished?.['@_value'] ?? '',
  }
}
