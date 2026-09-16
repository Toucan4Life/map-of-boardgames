import type { ExpressionSpecification, LineLayerSpecification } from 'maplibre-gl'

/**
 * Shared MapLibre style expressions/helpers used by both the main map (createMap.ts) and the
 * subgraph viewer (createMaplibreSubgraphViewer.ts), so the two views render nodes/edges consistently.
 */

/** A fresh empty GeoJSON FeatureCollection, used both to clear a source and as initial source data. */
export function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

/** Picks an icon based on the `complexity` feature property. */
export const ICON_IMAGE_BY_COMPLEXITY: ExpressionSpecification = [
  'case',
  ['>=', ['to-number', ['get', 'complexity']], 4],
  'star-icon',
  ['>=', ['to-number', ['get', 'complexity']], 3],
  'diamond-icon',
  ['>=', ['to-number', ['get', 'complexity']], 2],
  'triangle-icon',
  'circle-icon',
]

/** Colors a node icon on a 1-10 (poor-to-excellent) scale based on the `ratings` feature property. */
export const ICON_COLOR_BY_RATING: ExpressionSpecification = [
  'case',
  ['>=', ['to-number', ['get', 'ratings']], 7.6],
  '#034e7b', // rating 10 - Excellent
  ['>=', ['to-number', ['get', 'ratings']], 7.2],
  '#0570b0', // rating 9
  ['>=', ['to-number', ['get', 'ratings']], 6.9],
  '#3690c0', // rating 8 - Good
  ['>=', ['to-number', ['get', 'ratings']], 6.7],
  '#74a9cf', // rating 7
  ['>=', ['to-number', ['get', 'ratings']], 6.4],
  '#a6bddb', // rating 6
  ['>=', ['to-number', ['get', 'ratings']], 6.2],
  '#d0d1e6', // rating 5 - Average
  ['>=', ['to-number', ['get', 'ratings']], 5.9],
  '#fef0d9', // rating 4
  ['>=', ['to-number', ['get', 'ratings']], 5.6],
  '#fdcc8a', // rating 3
  ['>=', ['to-number', ['get', 'ratings']], 5.1],
  '#fc8d59', // rating 2
  '#d7301f', // rating 1 - Poor
]

/** Shared line paint for the "graph-edges" layer, used by both the main map and the subgraph viewer. */
export const GRAPH_EDGES_PAINT: LineLayerSpecification['paint'] = {
  'line-color': ['get', 'color'],
  'line-width': 2, // 2 pixels wide
  'line-opacity': 0.4,
}

/** Colors a graph edge on a light-to-dark brown scale based on its connection `weight`. */
export function getLineColorForWeight(weight: number): string {
  if (weight < 0.011183) return '#543005'
  if (weight < 0.046948) return '#8c510a'
  if (weight < 0.080745) return '#bf812d'
  if (weight < 0.142361) return '#dfc27d'
  return '#f6e8c3'
}

/** Converts `{from, to, color, weight}` edge lines into GeoJSON LineString features for a source's `setData`. */
export function linesToGeoJSON(
  lines: { from: [number, number]; to: [number, number]; color: string; weight?: number }[],
): GeoJSON.Feature<GeoJSON.LineString>[] {
  return lines.map((line) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [line.from, line.to] },
    properties: { color: line.color, weight: line.weight },
  }))
}
