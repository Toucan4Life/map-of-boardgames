import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import {
  GeoJSONSource,
  type AddLayerObject,
  type MapGeoJSONFeature,
  type PointLike,
} from 'maplibre-gl'
import config from './config'
import getColorTheme from './getColorTheme'
import type { Graph } from 'ngraph.graph'
import type { BoardGameLinkData, BoardGameNodeData } from './fetchAndProcessGraph.ts'
import type { SearchResult } from './createFuzzySearcher.js'
import type { Repositories } from './FocusViewModel.ts'
import { ICON_IMAGE_BY_COMPLEXITY, ICON_COLOR_BY_RATING, GRAPH_EDGES_PAINT, getLineColorForWeight, linesToGeoJSON, emptyFeatureCollection } from './mapStyleExpressions'
import { getDefaultMapStyle } from './mapDefaultStyle'
import { buildSearchUrl } from './searchQueryBuilder'

const primaryHighlightColor = '#bf2072'
const secondaryHighlightColor = '#e56aaa'

const currentColorTheme = getColorTheme()

export interface SearchParameters {
  minWeight: number
  maxWeight: number
  minRating: number
  maxRating: number
  minNumRatings: number
  maxNumRatings: number
  minPlaytime: number
  maxPlaytime: number
  playerChoice: number
  minPlayers: number
  maxPlayers: number
  minYear: number
  maxYear: number
  tags?: string[]
}

export class BoardGameMap {
  dispose() {
    this.map.remove()
  }
  map: maplibregl.Map
  containerValue: HTMLDivElement
  constructor(containerValue: HTMLDivElement) {
    this.containerValue = containerValue
    this.map = new maplibregl.Map(getDefaultMapStyle(this.containerValue))
    this.map.dragRotate.disable()
    this.map.touchZoomRotate.disableRotation()
  }

  async LoadMap() {
    const iconNames = ['circle', 'diamond', 'triangle', 'star']

    // Load all icons in parallel
    const iconPromises = iconNames.map(async (name) => {
      const image = await this.map.loadImage(config.iconSource + `/${name}.png`)
      this.map.addImage(`${name}-icon`, image.data, { sdf: true })
    })

    await Promise.all(iconPromises)

    // Add the circle layer after icons are loaded to avoid missing image warnings
    // Add circle layer before the label layer so labels appear on top
    this.map.addLayer(
      {
        id: 'circle-layer',
        type: 'symbol',
        source: 'points-source',
        'source-layer': 'points',
        filter: ['==', '$type', 'Point'],
        layout: {
          'icon-image': ICON_IMAGE_BY_COMPLEXITY,
          // Initial icon-size; replaced with normalized-by-community after data load
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            ['*', ['-', ['log10', ['+', ['to-number', ['get', 'size']], 1]], 0.301], 0.05],
            23,
            ['*', ['-', ['log10', ['+', ['to-number', ['get', 'size']], 1]], 0.301], 1.2],
          ],
          'icon-ignore-placement': true,
          'icon-allow-overlap': true,
        },
        paint: {
          'icon-color': ICON_COLOR_BY_RATING,
        },
      },
      'label-layer',
    ) // Add before label-layer so labels appear on top

    const linesLayer: AddLayerObject = {
      id: 'graph-edges',
      type: 'line',
      source: 'graph-edges-source',
      paint: GRAPH_EDGES_PAINT,
    }

    // Add lines layer before circle layer so icons appear on top of lines
    this.map.addLayer(linesLayer, 'circle-layer')
  }

  async highlightNode(searchParameters: SearchParameters): Promise<SearchResult[]> {
    this.map.setZoom(2)

    // Wait for the map to finish rendering at the new zoom level
    await new Promise<void>((resolve) => {
      void this.map.once('idle', () => { resolve(); })
    })

    // Fetch from API
    const response = await fetch(buildSearchUrl(searchParameters))
    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${String(response.status)}`)
    }

    interface ApiGameResult {
      lon: number
      lat: number
      id: number
      label: string
      year?: number | string
      ratings?: number | string
      complexity?: number | string
      size?: number | string
    }

    const apiResults = (await response.json()) as ApiGameResult[]

    const highlightedNodes: GeoJSON.GeoJSON = emptyFeatureCollection()

    const results: SearchResult[] = []

    // Process API results
    apiResults.forEach((game) => {
      const coordinates = [game.lon, game.lat]

      highlightedNodes.features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates },
        properties: {
          color: primaryHighlightColor,
          name: game.label,
          background: '#ff0000',
          textSize: 1.2,
        },
      })

      results.push({
        text: game.label,
        lat: game.lat,
        lon: game.lon,
        id: game.id,
        year: game.year?.toString() || '0',
        groupId: undefined, // API doesn't return groupId
        selected: false,
        skipAnimation: false,
        html: null,
        rating: game.ratings ? Number(game.ratings) : undefined,
        weight: game.complexity ? Number(game.complexity) : undefined,
        size: game.size ? Number(game.size) : undefined,
      })
    })
    void (this.map.getSource('selected-nodes') as GeoJSONSource).setData(highlightedNodes)
    this.map.redraw()
    return results
  }

  async getGroupIdAt(lat: number, lon: number): Promise<number | undefined> {
    const col = (await (this.map.getSource('borders-source') as GeoJSONSource).getData()) as GeoJSON.FeatureCollection<GeoJSON.Polygon>
    const feature = col.features.find((f) => {
      return this.polygonContainsPoint((f.geometry).coordinates[0], lon, lat)
    })
    return feature?.id !== undefined ? +feature.id : undefined
  }

  clearBorderHighlights(): void {
    this.map.setLayoutProperty('border-highlight', 'visibility', 'none')
  }

  clearHighlights(): void {
    void (this.map.getSource('graph-edges-source') as GeoJSONSource).setData(emptyFeatureCollection())
    this.map.redraw()
    void (this.map.getSource('selected-nodes') as GeoJSONSource).setData(emptyFeatureCollection())
    this.map.redraw()
  }

  getBackgroundNearPoint(point: PointLike): maplibregl.MapGeoJSONFeature | undefined {
    return this.map.queryRenderedFeatures(point, { layers: ['polygon-layer'] })[0]
  }

  drawBackgroundEdges(repo: string, bgFeature: maplibregl.MapGeoJSONFeature, groupGraph: Graph<BoardGameNodeData, BoardGameLinkData>): void {
    if (bgFeature.id === undefined) return

    const groupId = +bgFeature.id
    const fillColor = this.getPolygonFillColor(bgFeature.properties)

    void (this.map.getSource('graph-edges-source') as GeoJSONSource).setData(emptyFeatureCollection())

    const highlightedNodes: GeoJSON.GeoJSON = emptyFeatureCollection()

    const firstLevelLinks: { from: [number, number]; to: [number, number]; color: string; weight: number }[] = []

    // Create adjustment map inline
    const renderedNodesAdjustment = new Map()
    this.map
      .querySourceFeatures('points-source', {
        sourceLayer: 'points',
        filter: ['==', 'parent', groupId],
      })
      .forEach((repo) => {
        const lngLat = (repo.geometry as GeoJSON.Point).coordinates
        renderedNodesAdjustment.set(repo.properties.label, { lngLat })
      })

    let primaryNodePositionFound = false
    const lines: {
      from: [number, number]
      to: [number, number]
      color: string
      weight: number
    }[] = []
    groupGraph.forEachLink((link) => {
      if (link.data.s == undefined) {
        // this means the status is "Shown"
        const fromGeo: [number, number] = renderedNodesAdjustment.get(link.fromId)?.lngLat || groupGraph.getNode(link.fromId)?.data.lnglat
        const toGeo: [number, number] = renderedNodesAdjustment.get(link.toId)?.lngLat || groupGraph.getNode(link.toId)?.data.lnglat

        const isFirstLevel = repo === groupGraph.getNode(link.fromId)?.data.label || repo === groupGraph.getNode(link.toId)?.data.label
        const lineColor = getLineColorForWeight(link.data.weight)

        const line: { from: [number, number]; to: [number, number]; color: string; weight: number } = {
          from: fromGeo,
          to: toGeo,
          color: isFirstLevel ? '#ffffff' : lineColor,
          weight: link.data.weight,
        }

        if (isFirstLevel) {
          firstLevelLinks.push(line)

          if (!primaryNodePositionFound) {
            highlightedNodes.features.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: repo === groupGraph.getNode(link.fromId)?.data.label ? fromGeo : toGeo },
              properties: { color: primaryHighlightColor, name: repo, background: fillColor, textSize: 1.2 },
            })
            primaryNodePositionFound = true
          }

          const otherName = repo === groupGraph.getNode(link.fromId)?.data.label ? link.toId : link.fromId
          highlightedNodes.features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: repo === groupGraph.getNode(link.fromId)?.data.label ? toGeo : fromGeo },
            properties: { color: secondaryHighlightColor, name: groupGraph.getNode(otherName)?.data.label, background: fillColor, textSize: 0.8 },
          })
        } else {
          lines.push(line)
        }
      }
    })

    firstLevelLinks.forEach((line) => {
      lines.push(line)
    })
    void (this.map.getSource('selected-nodes') as GeoJSONSource).setData(highlightedNodes)
    void (this.map.getSource('graph-edges-source') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: linesToGeoJSON(lines),
    })
  }

  findNearestCity(point: { x: number; y: number }): MapGeoJSONFeature | undefined {
    const width = 16
    const height = 16
    const features = this.map.queryRenderedFeatures(
      [
        [point.x - width / 2, point.y - height / 2],
        [point.x + width / 2, point.y + height / 2],
      ],
      { layers: ['circle-layer'] },
    )

    if (!features.length) return

    // Use reduce instead of imperative loop to find nearest
    return features.reduce<{ feature: MapGeoJSONFeature; distance: number } | null>((nearest, feature) => {
      const geometry = (feature.geometry as GeoJSON.Point).coordinates
      const dx = geometry[0] - point.x
      const dy = geometry[1] - point.y
      const distance = dx * dx + dy * dy

      return !nearest || distance < nearest.distance ? { feature, distance } : nearest
    }, null)?.feature
  }

  getLargestRepositories(id: number): Map<string, Repositories> {
    const seen = new Map<string, Repositories>()
    const largeRepositories = this.map
      .querySourceFeatures('points-source', {
        sourceLayer: 'points',
        filter: ['==', 'c', id.toString()],
      })
      .sort((a, b) => b.properties.size - a.properties.size)
    for (const repo of largeRepositories) {
      const label = repo.properties.label
      if (seen.has(label)) continue

      seen.set(label, {
        name: label,
        lngLat: (repo.geometry as GeoJSON.Point).coordinates.slice(0, 2) as [number, number],
        id: repo.properties.id,
        isExternal: repo.properties.isExternal,
        linkWeight: repo.properties.linkWeight,
      })

      if (seen.size >= 100) break
    }
    return seen
  }
  getPolygonFillColor(polygonProperties: Record<string, string>): string | undefined {
    // Use find() and nullish coalescing instead of for-loop
    const colorMapping = currentColorTheme.color.find((color) => color.input === polygonProperties.fill)
    return colorMapping?.output ?? polygonProperties.fill
  }

  polygonContainsPoint(ring: GeoJSON.Position[], pX: number, pY: number): boolean {
    let c = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const p1 = ring[i]
      const p2 = ring[j]
      if (p1[1] > pY !== p2[1] > pY && pX < ((p2[0] - p1[0]) * (pY - p1[1])) / (p2[1] - p1[1]) + p1[0]) {
        c = !c
      }
    }
    return c
  }
}
