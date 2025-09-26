import type { Feature, Point } from 'geojson'

export function getPlaceLabels(onlinePlaces: Feature<Point>[], localPlaces: Feature<Point>[]): { isChanged: boolean; merged: Feature<Point>[] } {
  const merg = new Map(localPlaces.filter((f) => f.properties?.labelId).map((f) => [f.properties?.labelId, f]))

  onlinePlaces.forEach((f, k) => {
    if (!merg.has(k)) {
      merg.set(k, f)
    }
  })

  const merged = Array.from(merg.values())
  return { isChanged: hasChanges(merged, onlinePlaces), merged }
}

function hasChanges(merged: Feature<Point>[], indexedPlaces: Feature<Point>[]): boolean {
  return merged.some((f) => {
    const orig = f.properties?.labelId && indexedPlaces.find((feat) => feat?.properties?.labelId === f?.properties?.labelId)
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

export function editLabel(
  value: string,
  lnglat: maplibregl.LngLat,
  features: GeoJSON.Feature<GeoJSON.Point>[],
  oldLabelProps: string | undefined,
  zoom: number,
): GeoJSON.Feature<GeoJSON.Point>[] {
  if (oldLabelProps && !value) {
    features = features.filter((f) => f.properties?.labelId !== oldLabelProps)
  } else if (oldLabelProps && value) {
    const label = features.find((f) => f.properties?.labelId === oldLabelProps)
    if (label?.properties) {
      label.properties.name = value
      label.properties.symbolzoom = Math.ceil(zoom)
      label.geometry.coordinates = [round(lnglat.lng), round(lnglat.lat)]
    }
  } else {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [round(lnglat.lng), round(lnglat.lat)] },
      properties: {
        symbolzoom: Math.ceil(zoom),
        name: value,
        labelId: generateShortRandomId(),
      },
    })
  }
  return features
}
