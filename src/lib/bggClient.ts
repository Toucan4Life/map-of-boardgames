import { XMLParser } from 'fast-xml-parser'

const rawBGGUrl = 'https://wispy-haze-6332.tdp94.workers.dev' // Worker base
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
  categories: string[]
  mechanics: string[]
  families: string[]
  expansions: Array<{ id: string; name: string }>
  accessories: string[]
  designers: string[]
  artists: string[]
  publishers: string[]
  usersRated: number
  ranks: Array<{ name: string; value: string }>
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
  const res = await fetch(`${rawBGGUrl}/xmlapi2/thing?id=${thingId}&stats=1`)
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

  // Helper function to extract links by type
  const extractLinks = (linkType: string): string[] => {
    const links = item.link ?? []
    const linkArray = Array.isArray(links) ? links : [links]
    return linkArray.filter((link: { [x: string]: string }) => link['@_type'] === linkType).map((link: { [x: string]: string }) => link['@_value'])
  }

  // Extract expansions with IDs
  const extractExpansions = (): Array<{ id: string; name: string }> => {
    const links = item.link ?? []
    const linkArray = Array.isArray(links) ? links : [links]
    return linkArray
      .filter((link: { [x: string]: string }) => link['@_type'] === 'boardgameexpansion')
      .map((link: { [x: string]: string }) => ({
        id: link['@_id'],
        name: link['@_value'],
      }))
  }

  // Extract ranks
  const ranks = []
  const ranksData = item.statistics?.ratings?.ranks?.rank ?? []
  const ranksArray = Array.isArray(ranksData) ? ranksData : [ranksData]
  for (const rank of ranksArray) {
    if (rank && rank['@_value'] !== 'Not Ranked') {
      ranks.push({
        name: rank['@_friendlyname'] || '',
        value: rank['@_value'] || '',
      })
    }
  }

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
    categories: extractLinks('boardgamecategory'),
    mechanics: extractLinks('boardgamemechanic'),
    families: extractLinks('boardgamefamily'),
    expansions: extractExpansions(),
    accessories: extractLinks('boardgameaccessory'),
    designers: extractLinks('boardgamedesigner'),
    artists: extractLinks('boardgameartist'),
    publishers: extractLinks('boardgamepublisher'),
    usersRated: parseInt(item.statistics?.ratings?.usersrated?.['@_value'] ?? '0', 10),
    ranks,
  }
}
