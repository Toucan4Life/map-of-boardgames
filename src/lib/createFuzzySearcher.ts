export interface SearchResult {
  groupId: number | undefined
  selected: boolean
  skipAnimation: boolean
  html: string | null
  text: string
  lat: number
  lon: number
  id: number
  year: string
}
