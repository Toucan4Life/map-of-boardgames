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
}
const options = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
}
const parser = new XMLParser(options)

export async function getGameInfo(thingId: number): Promise<GameDetail | undefined> {
  const response = await fetch(`${rawBGGUrl}/thing?id=${thingId}&stats=1`)
  if (response.ok) {
    const parsedResponse = await response.text()
    const p = parser.parse(parsedResponse)

    return {
      imageUrl: p.items.item.image,
      rating: parseFloat(p.items.item.statistics.ratings.average['@_value']).toFixed(1),
      description: htmlDecode(p.items.item.description).split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+/)[0],
      minPlayTime: p.items.item.minplaytime['@_value'],
      maxPlayTime: p.items.item.maxplaytime['@_value'],
      weight: parseFloat(p.items.item.statistics.ratings.averageweight['@_value']).toFixed(2),
      minAge: p.items.item.minage['@_value'],
      recommendedAge: p.items.item.poll
        .filter((t: { [x: string]: string }) => t['@_name'] == 'suggested_playerage')[0]
        .results.result.sort(function (a: { [x: string]: number }, b: { [x: string]: number }) {
          return b['@_numvotes'] - a['@_numvotes']
        })[0]['@_value'],
      minPlayers: p.items.item.minplayers['@_value'],
      maxPlayers: p.items.item.maxplayers['@_value'],
      recommendedPlayers: p.items.item['poll-summary'].result
        .filter((t: { [x: string]: string }) => t['@_name'] == 'recommmendedwith')[0]
        ['@_value'].match('Recommended with (.*?) players')[1],
      bestPlayers: p.items.item['poll-summary'].result
        .filter((t: { [x: string]: string }) => t['@_name'] == 'bestwith')[0]
        ['@_value'].match('Best with (.*?) players')[1],
    }
  }
}
function htmlDecode(input: string) {
  const doc = new DOMParser().parseFromString(input, 'text/html')
  if (doc.documentElement.textContent) return doc.documentElement.textContent
  else return ''
}
