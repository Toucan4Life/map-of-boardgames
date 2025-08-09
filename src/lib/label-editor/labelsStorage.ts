import config from '../config'
import bus from '../bus'
import { LngLat } from 'maplibre-gl'

let originalPlaces: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}
const indexedPlaces = new Map()

export async function getPlaceLabels(): Promise<GeoJSON.FeatureCollection<GeoJSON.Point> | undefined> {
  const r = await fetch(config.placesSource, { mode: 'cors' })
  originalPlaces = await r.json()
  originalPlaces.features.forEach((f) => {
    if (!f.properties) return
    indexedPlaces.set(f.properties.labelId, f)
  })

  const mergedLabels = mergePlacesWithLocalStorage()
  const hasChanges = checkOriginalPlacesForChanges(mergedLabels)
  if (hasChanges) bus.fire('unsaved-changes-detected', hasChanges)
  return mergedLabels
}

function savePlaceLabels(places: GeoJSON.GeoJSON | undefined): void {
  localStorage.setItem('places', JSON.stringify(places))
}

export function addLabelToPlaces(
  places: GeoJSON.FeatureCollection<GeoJSON.Point> | undefined,
  value: string,
  lngLat: LngLat,
  mapZoomLevel: number,
  borderOwnerId: string | number | undefined,
): GeoJSON.FeatureCollection<GeoJSON.Point> | undefined {
  let labelId = generateShortRandomId()
  while (indexedPlaces.has(labelId)) labelId = generateShortRandomId()

  const label: GeoJSON.Feature<GeoJSON.Point> = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat].map((x) => Math.round(x * 1000) / 1000) },
    properties: { symbolzoom: Math.ceil(mapZoomLevel), name: value, labelId },
  }
  if (borderOwnerId !== undefined && label.properties) {
    label.properties.ownerId = borderOwnerId
  }
  if (places) places.features.push(label)

  indexedPlaces.set(labelId, label)
  savePlaceLabels(places)
  return places
}

export function editLabelInPlaces(
  labelId: string,
  places: GeoJSON.FeatureCollection<GeoJSON.Point> | undefined,
  value: string,
  lngLat: LngLat,
  mapZoomLevel: number,
): GeoJSON.FeatureCollection<GeoJSON.Point> | undefined {
  if (!places) return
  if (!value) {
    places.features = places.features.filter((f) => f.properties?.labelId !== labelId)
    indexedPlaces.delete(labelId)
  } else {
    const labelToModify = places.features.find((f) => f.properties?.labelId === labelId)
    if (!labelToModify?.properties) return
    labelToModify.properties.name = value
    labelToModify.properties.symbolzoom = Math.ceil(mapZoomLevel)
    labelToModify.geometry.coordinates = [lngLat.lng, lngLat.lat].map((x) => Math.round(x * 1000) / 1000)
    indexedPlaces.set(labelId, labelToModify)
  }

  savePlaceLabels(places)
  return places
}

function mergePlacesWithLocalStorage(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  let savedPlaces: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  const places = localStorage.getItem('places')
  if (places) savedPlaces = JSON.parse(places)

  const mergeIndex = new Map()
  for (const savedPlace of savedPlaces.features) {
    const placeKey = savedPlace.properties?.labelId
    const place = mergeIndex.get(placeKey)
    if (place) {
      // local override:
      mergeIndex.set(placeKey, Object.assign({}, place, savedPlace))
    } else {
      // local only:
      mergeIndex.set(placeKey, savedPlace)
    }
  }

  indexedPlaces.forEach((place, placeKey) => {
    if (!mergeIndex.has(placeKey)) {
      // remote only:
      mergeIndex.set(placeKey, place)
    }
  })

  return {
    type: 'FeatureCollection',
    features: Array.from(mergeIndex.values()),
  }
}

function checkOriginalPlacesForChanges(mergedPlaces: GeoJSON.FeatureCollection<GeoJSON.Point> | undefined) {
  if (!mergedPlaces) return false

  for (const resolvedPlace of mergedPlaces.features) {
    const placeKey = resolvedPlace.properties?.labelId
    const place = indexedPlaces.get(placeKey)
    if (!place) return true
    if (place.properties.name !== resolvedPlace.properties?.name) return true
    if (place.properties.symbolzoom !== resolvedPlace.properties?.symbolzoom) return true
    if (place.geometry.coordinates[0] !== resolvedPlace.geometry.coordinates[0]) return true
    if (place.geometry.coordinates[1] !== resolvedPlace.geometry.coordinates[1]) return true
  }

  return false
}

function generateShortRandomId(): string {
  return Math.random().toString(36).substring(2, 5)
}
