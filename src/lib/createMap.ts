import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl, {
  GeoJSONSource,
  type AddLayerObject,
  type FilterSpecification,
  type MapGeoJSONFeature,
  type MapOptions,
  type PointLike,
} from 'maplibre-gl'
import config from './config'
import getColorTheme from './getColorTheme'
import type { Graph } from 'ngraph.graph'
import type { BoardGameLinkData, BoardGameNodeData } from './fetchAndProcessGraph.ts'
import type { Repositories } from './FocusViewModel.ts'
const primaryHighlightColor = '#bf2072'
const secondaryHighlightColor = '#e56aaa'

const currentColorTheme = getColorTheme()

export interface SearchParameters {
  minWeight: number
  maxWeight: number
  minRating: number
  maxRating: number
  minPlaytime: number
  maxPlaytime: number
  playerChoice: number
  minPlayers: number
  maxPlayers: number
  minYear: number
  maxYear: number
}

export class BoardGameMap {
  dispose() {
    this.map.remove()
  }
  map: maplibregl.Map
  containerValue: HTMLDivElement
  constructor(containerValue: HTMLDivElement) {
    this.containerValue = containerValue
    this.map = new maplibregl.Map(this.getDefaultStyle())
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
          'icon-image': [
            'case',
            ['>=', ['to-number', ['get', 'complexity']], 4],
            'star-icon',
            ['>=', ['to-number', ['get', 'complexity']], 3],
            'diamond-icon',
            ['>=', ['to-number', ['get', 'complexity']], 2],
            'triangle-icon',
            'circle-icon',
          ],
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
          'icon-color': [
            'case',
            ['>=', ['to-number', ['get', 'ratings']], 7.609174],
            '#00e9ff',
            ['>=', ['to-number', ['get', 'ratings']], 7.204706],
            '#00f8d8',
            ['>=', ['to-number', ['get', 'ratings']], 6.918946],
            '#00ff83',
            ['>=', ['to-number', ['get', 'ratings']], 6.65909],
            '#62f25e',
            ['>=', ['to-number', ['get', 'ratings']], 6.42297],
            '#87e539',
            ['>=', ['to-number', ['get', 'ratings']], 6.18157],
            '#a2d600',
            ['>=', ['to-number', ['get', 'ratings']], 5.900366],
            '#c3b700',
            ['>=', ['to-number', ['get', 'ratings']], 5.565964],
            '#de9200',
            ['>=', ['to-number', ['get', 'ratings']], 5.07692],
            '#f36300',
            '#ff0000',
          ],
        },
      },
      'label-layer',
    ) // Add before label-layer so labels appear on top

    // Recompute when new vector tiles load
    // this.map.on('sourcedata', (e) => {
    //   if (e.sourceId === 'points-source' && this.map.getLayer('circle-layer')) {
    //     this.updateIconSizeScaling()
    //   }
    // })
    const linesLayer: AddLayerObject = {
      id: 'graph-edges',
      type: 'line',
      source: 'graph-edges-source',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2, // 2 pixels wide
        'line-opacity': 0.4,
      },
    }

    // Add lines layer before circle layer so icons appear on top of lines
    this.map.addLayer(linesLayer, 'circle-layer')
  }

  highlightNode(searchParameters: SearchParameters): void {
    if (this.map.getZoom() < 3) this.map.setZoom(3)

    const highlightedNodes: GeoJSON.GeoJSON = {
      type: 'FeatureCollection',
      features: [],
    }

    let playerMinField: string
    let playerMaxField: string
    switch (searchParameters.playerChoice) {
      case 1:
        playerMinField = 'min_players_rec'
        playerMaxField = 'max_players_rec'
        break
      case 2:
        playerMinField = 'min_players_best'
        playerMaxField = 'max_players_best'
        break
      default:
        playerMinField = 'min_players'
        playerMaxField = 'max_players'
    }

    const selectedFilters: FilterSpecification = [
      'all',
      ['>=', ['to-number', ['get', 'complexity']], searchParameters.minWeight],
      ['<=', ['to-number', ['get', 'complexity']], searchParameters.maxWeight],
      ['>=', ['to-number', ['get', 'ratings']], searchParameters.minRating],
      ['<=', ['to-number', ['get', 'ratings']], searchParameters.maxRating],
      ['>=', ['to-number', ['get', 'year']], searchParameters.minYear],
      ['<=', ['to-number', ['get', 'year']], searchParameters.maxYear],
      [
        'all',
        ['>=', ['to-number', ['get', 'min_time']], searchParameters.minPlaytime],
        ['<=', ['to-number', ['get', 'max_time']], searchParameters.maxPlaytime],
      ],
      [
        'all',
        ['<=', ['to-number', ['get', playerMinField]], searchParameters.maxPlayers],
        ['>=', ['to-number', ['get', playerMaxField]], searchParameters.minPlayers],
      ],
    ]
    console.log(selectedFilters)
    this.map
      .querySourceFeatures('points-source', {
        sourceLayer: 'points',
        filter: selectedFilters,
      })
      .forEach((repo) => {
        const coordinates = (repo.geometry as GeoJSON.Point).coordinates
        highlightedNodes.features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates },
          properties: {
            color: primaryHighlightColor,
            name: repo.properties.label,
            background: '#ff0000',
            textSize: 1.2,
          },
        })
      })
    ;(this.map.getSource('selected-nodes') as GeoJSONSource).setData(highlightedNodes)
    this.map.redraw()
  }

  async getGroupIdAt(lat: number, lon: number): Promise<number | undefined> {
    const col = (await (this.map.getSource('borders-source') as GeoJSONSource).getData()) as GeoJSON.FeatureCollection<GeoJSON.Polygon>
    const feature = col.features.find((f) => {
      return this.polygonContainsPoint((f.geometry as GeoJSON.Polygon).coordinates[0], lat, lon)
    })
    return feature?.id !== undefined ? +feature.id : undefined
  }

  clearBorderHighlights(): void {
    this.map.setLayoutProperty('border-highlight', 'visibility', 'none')
  }

  clearHighlights(): void {
    ;(this.map.getSource('graph-edges-source') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: [],
    })
    this.map.redraw()
    ;(this.map.getSource('selected-nodes') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: [],
    })
    this.map.redraw()
  }

  getBackgroundNearPoint(point: PointLike): maplibregl.MapGeoJSONFeature {
    return this.map.queryRenderedFeatures(point, { layers: ['polygon-layer'] })[0]
  }

  drawBackgroundEdges(repo: string, bgFeature: maplibregl.MapGeoJSONFeature, groupGraph: Graph<BoardGameNodeData, BoardGameLinkData>): void {
    if (bgFeature.id === undefined) return

    const groupId = +bgFeature.id
    const fillColor = this.getPolygonFillColor(bgFeature.properties)

    ;(this.map.getSource('graph-edges-source') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: [],
    })

    const highlightedNodes: GeoJSON.GeoJSON = {
      type: 'FeatureCollection',
      features: [],
    }

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
        const lineColor = (() => {
          switch (true) {
            case link.data.weight < 0.011183:
              return '#4a148c'
            case link.data.weight < 0.046948:
              return '#7b1fa2'
            case link.data.weight < 0.080745:
              return '#ab47bc'
            case link.data.weight < 0.142361:
              return '#ff7043'
            default:
              return '#ff5722'
          }
        })()

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
    const GeoJSONLine: GeoJSON.Feature<GeoJSON.LineString>[] = []
    lines.forEach((line) =>
      GeoJSONLine.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [line.from, line.to],
        },
        properties: {
          color: line.color,
          weight: line.weight,
        },
      }),
    )
    ;(this.map.getSource('selected-nodes') as GeoJSONSource).setData(highlightedNodes)
    ;(this.map.getSource('graph-edges-source') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: GeoJSONLine,
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

  getDefaultStyle(): MapOptions {
    return {
      hash: true,
      container: this.containerValue,
      center: [0, 0],
      zoom: 2,
      style: {
        version: 8,
        glyphs: config.glyphsSource,
        sources: {
          'borders-source': { type: 'geojson', data: config.bordersSource },
          'points-source': {
            type: 'vector',
            tiles: [config.vectorTilesTiles],
            minzoom: 0,
            maxzoom: 5,
            bounds: [-154.781, -147.422, 154.781, 147.422],
          },
          place: { type: 'geojson', data: config.placesSource },
          'selected-nodes': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          },
          'graph-edges-source': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': currentColorTheme.background,
            },
          },
          {
            id: 'polygon-layer',
            type: 'fill',
            source: 'borders-source',
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'fill-color': ['get', 'fill'],
            },
          },
          {
            id: 'border-highlight',
            type: 'line',
            source: 'borders-source',
            layout: {
              visibility: 'none',
            },
            paint: {
              'line-color': '#FFF',
              'line-width': 4,
            },
          },
          // Circle layer will be added dynamically after icons are loaded
          {
            id: 'label-layer',
            type: 'symbol',
            source: 'points-source',
            'source-layer': 'points',
            filter: ['>=', ['zoom'], 6],
            layout: {
              'text-allow-overlap': false,
              'text-ignore-placement': false,
              'text-font': ['Roboto Condensed Regular'],
              'text-field': ['get', 'label'],
              'text-anchor': 'top',
              'text-max-width': 10,
              'symbol-sort-key': ['-', 0, ['to-number', ['get', 'size']]],
              'symbol-spacing': 500,
              'text-offset': [0, 0.5],
              'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                6,
                ['*', ['-', ['log10', ['+', ['to-number', ['get', 'size']], 1]], 0.301], 5],
                10,
                ['+', ['*', ['-', ['log10', ['+', ['to-number', ['get', 'size']], 1]], 0.301], 1.5], 20],
              ],
            },
            paint: {
              'text-color': currentColorTheme.circleLabelsColor,
              'text-halo-color': currentColorTheme.circleLabelsHaloColor,
              'text-halo-width': currentColorTheme.circleLabelsHaloWidth,
            },
          },
          {
            id: 'selected-nodes-labels-layer',
            type: 'symbol',
            source: 'selected-nodes',
            layout: {
              'text-allow-overlap': true,
              'text-ignore-placement': false,
              'text-font': ['Roboto Condensed Regular'],
              'text-field': ['get', 'name'],
              'text-anchor': 'top',
              'text-max-width': 10,
              'symbol-sort-key': ['-', 0, ['to-number', ['get', 'size']]],
              'symbol-spacing': 500,
              'text-offset': [0, 0.5],
              'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                ['*', ['to-number', ['get', 'size']], 0.00008],
                20,
                ['+', ['to-number', ['get', 'size']], 0.000006],
              ],
            },
            paint: {
              'text-color': '#fff',
              'text-halo-color': ['get', 'color'],
              'text-halo-width': 2,
            },
          },
          {
            id: 'place-country-1',
            maxzoom: 10,
            type: 'symbol',
            source: 'place',
            layout: {
              'text-font': ['Roboto Condensed Bold'],
              'text-size': [
                'interpolate',
                ['cubic-bezier', 0.2, 0, 0.7, 1],
                ['zoom'],
                1,
                ['step', ['get', 'symbolzoom'], 15, 4, 13, 5, 12],
                9,
                ['step', ['get', 'symbolzoom'], 22, 4, 19, 5, 17],
              ],
              'symbol-sort-key': ['get', 'symbolzoom'],
              'text-field': '{name}',
              'text-max-width': 6,
              'text-line-height': 1.1,
              'text-letter-spacing': 0,
            },
            paint: {
              'text-color': currentColorTheme.placeLabelsColor,
              'text-halo-color': currentColorTheme.placeLabelsHaloColor,
              'text-halo-width': currentColorTheme.placeLabelsHaloWidth,
            },
            filter: ['<=', ['get', 'symbolzoom'], ['+', ['zoom'], 4]],
          },
        ],
      },
    }
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
