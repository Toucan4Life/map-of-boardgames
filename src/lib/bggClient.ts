import { XMLParser } from 'fast-xml-parser'

const rawBGGUrl = 'https://boardgamegeek.com/xmlapi2'
export interface GameDetail {
  imageUrl: string
  rating: string
  description: string
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
    }
  }
}
function htmlDecode(input: string) {
  const doc = new DOMParser().parseFromString(input, 'text/html')
  if (doc.documentElement.textContent) return doc.documentElement.textContent
  else return ''
}
