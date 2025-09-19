import { LngLat } from 'maplibre-gl'
import type { FeatureCollection, Feature, Point } from 'geojson'

export function getPlaceLabels(
  onlinePlaces: FeatureCollection<Point>,
  localPlaces: FeatureCollection<Point>,
): { isChanged: boolean; merged: FeatureCollection<Point> } {
  const merg = new Map(localPlaces.features.filter((f) => f.properties?.labelId).map((f) => [f.properties?.labelId, f]))
  onlinePlaces.features.forEach((f, k) => {
    merg.has(k) || merg.set(k, f)
  })
  const merged: FeatureCollection<Point> = { type: 'FeatureCollection', features: Array.from(merg.values()) }
  return { isChanged: hasChanges(merged, onlinePlaces), merged }
}

export function addLabelToPlaces(
  places: FeatureCollection<Point> | undefined,
  value: string,
  lngLat: LngLat,
  mapZoomLevel: number,
  borderOwnerId: string | number | undefined,
): FeatureCollection<Point> | undefined {
  const labelId = generateShortRandomId()
  const label: Feature<Point> = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [round(lngLat.lng), round(lngLat.lat)] },
    properties: {
      symbolzoom: Math.ceil(mapZoomLevel),
      name: value,
      labelId,
      ...(borderOwnerId !== undefined && { ownerId: borderOwnerId }),
    },
  }
  places?.features.push(label)
  return places
}

export function editLabelInPlaces(
  labelId: string,
  places: FeatureCollection<Point> | undefined,
  value: string,
  lngLat: LngLat,
  mapZoomLevel: number,
): FeatureCollection<Point> | undefined {
  if (!places) return

  if (!value) {
    places.features = places.features.filter((f) => f.properties?.labelId !== labelId)
    return places
  }

  const label = places.features.find((f) => f.properties?.labelId === labelId)
  if (!label?.properties) return places

  label.properties.name = value
  label.properties.symbolzoom = Math.ceil(mapZoomLevel)
  label.geometry.coordinates = [round(lngLat.lng), round(lngLat.lat)]

  return places
}

function hasChanges(merged: FeatureCollection<Point>, indexedPlaces: FeatureCollection<Point>): boolean {
  return merged.features.some((f) => {
    const orig = f.properties?.labelId && indexedPlaces.features.find((feat) => feat?.properties?.labelId === f?.properties?.labelId)
    return (
      !orig ||
      orig.properties?.name !== f.properties?.name ||
      orig.properties?.symbolzoom !== f.properties?.symbolzoom ||
      orig.geometry.coordinates[0] !== f.geometry.coordinates[0] ||
      orig.geometry.coordinates[1] !== f.geometry.coordinates[1]
    )
  })
}

const round = (n: number) => Math.round(n * 1000) / 1000
const generateShortRandomId = () => Math.random().toString(36).substring(2, 5)
