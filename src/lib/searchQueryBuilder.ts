import type { SearchParameters } from './createMap'

/** Builds the advanced-search API URL (filters, tags, pagination/sorting) from the user's search parameters. */
export function buildSearchUrl(searchParameters: SearchParameters): string {
  const apiUrl = new URL('https://solitary-dust-dc64.tdp94.workers.dev/')
  const params = apiUrl.searchParams

  // Add numeric filters
  params.set('ratings_min', searchParameters.minRating.toString())
  params.set('ratings_max', searchParameters.maxRating.toString())
  params.set('size_min', searchParameters.minNumRatings.toString())
  params.set('size_max', searchParameters.maxNumRatings.toString())
  params.set('complexity_min', searchParameters.minWeight.toString())
  params.set('complexity_max', searchParameters.maxWeight.toString())
  params.set('year_min', searchParameters.minYear.toString())
  params.set('year_max', searchParameters.maxYear.toString())

  // Add playtime filters
  params.set('playtime_min', searchParameters.minPlaytime.toString())
  params.set('playtime_max', searchParameters.maxPlaytime.toString())

  // Add player filter based on playerChoice
  switch (searchParameters.playerChoice) {
    case 1: // Recommended players
      params.set('rec_players_min', searchParameters.minPlayers.toString())
      params.set('rec_players_max', searchParameters.maxPlayers.toString())
      break
    case 2: // Best players
      params.set('best_players_min', searchParameters.minPlayers.toString())
      params.set('best_players_max', searchParameters.maxPlayers.toString())
      break
    default: // Regular players
      params.set('players_min', searchParameters.minPlayers.toString())
      params.set('players_max', searchParameters.maxPlayers.toString())
  }

  // Add tag filters
  if (searchParameters.tags && searchParameters.tags.length > 0) {
    const categories: string[] = []
    const mechanics: string[] = []
    const families: string[] = []

    searchParameters.tags.forEach((tagKey) => {
      const parts = tagKey.split('-')
      if (parts.length < 2) return

      const type = parts[0]
      const id = parts.slice(1).join('-')

      if (type === 'category') {
        categories.push(id)
      } else if (type === 'mechanic') {
        mechanics.push(id)
      } else if (type === 'family') {
        families.push(id)
      }
    })

    if (categories.length > 0) {
      params.set('category', categories.join(','))
    }
    if (mechanics.length > 0) {
      params.set('mechanic', mechanics.join(','))
    }
    if (families.length > 0) {
      params.set('family', families.join(','))
    }
  }

  // Set pagination and sorting
  params.set('limit', '1000')
  params.set('sort_by', 'ratings')
  params.set('sort_order', 'desc')

  return apiUrl.toString()
}
