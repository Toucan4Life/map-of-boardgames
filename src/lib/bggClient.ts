import { XMLParser } from 'fast-xml-parser'

const rawBGGUrl = 'https://boardgamegeek.com/xmlapi2'
export interface GameDetail {
  imageUrl: string
}
const options = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
}
const parser = new XMLParser(options)

export async function getGameInfo(thingId: number): Promise<GameDetail | undefined> {
  const response = await fetch(`${rawBGGUrl}/thing?id=${thingId}`)
  if (response.ok) {
    const parsedResponse = await response.text()
    const p = parser.parse(parsedResponse)

    return {
      imageUrl: p.items.item.image,
    }
  }
}
