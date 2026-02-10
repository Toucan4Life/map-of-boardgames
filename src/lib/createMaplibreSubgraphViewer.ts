import maplibregl, { GeoJSONSource, type AddLayerObject, type LngLatBoundsLike, type StyleSpecification } from 'maplibre-gl'
import config from './config'
import getColorTheme from './getColorTheme'
import { type Layout } from 'ngraph.forcelayout'
import type { Graph, NodeId } from 'ngraph.graph'
import createLayout from 'ngraph.forcelayout'
import type { BoardGameLinkData, BoardGameNodeData } from './fetchAndProcessGraph.js'
import type { SearchResult } from './createFuzzySearcher.js'
const currentColorTheme = getColorTheme()
interface LinkLine {
  from: [number, number]
  to: [number, number]
  color: string
  weight?: number
}
// Default map style configuration for subgraph viewer
const mapStyle: StyleSpecification = {
  version: 8,
  glyphs: config.glyphsSource,
  sources: {
    // No external sources needed initially
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': currentColorTheme.background,
      },
    },
  ],
}

// Colors matching the main map theme
const NODE_COLORS = {
  default: '#EAEDEF', // Default node color
  selected: '#bf2072', // Primary highlight color
  neighbor: '#e56aaa', // Secondary highlight color
  textColor: currentColorTheme.circleLabelsColor,
  textHaloColor: currentColorTheme.circleLabelsHaloColor,
  textHaloWidth: currentColorTheme.circleLabelsHaloWidth,
}

// Scale factor for converting layout coordinates to map coordinates
const COORDINATE_SCALE_FACTOR = 100

// Helper function to convert layout coordinates to map coordinates
function convertLayoutToMapCoordinates(pos: { x: number; y: number }) {
  return {
    lng: pos.x / COORDINATE_SCALE_FACTOR,
    lat: pos.y / COORDINATE_SCALE_FACTOR,
  }
}

export function createMaplibreSubgraphViewer(subgraphInfo: {
  container: Element
  graph: Graph<BoardGameNodeData, BoardGameLinkData>
  onLayoutStatusChange: (arg0: boolean) => void
  nodeId: number
  onMapClicked: (searchResult: SearchResult) => void
}) {
  const container = subgraphInfo.container //document.querySelector('.subgraph-viewer')
  container.classList.add('active')

  // Clear the container first
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }

  // Create map container
  const mapContainer = document.createElement('div')
  mapContainer.style.width = '100%'
  mapContainer.style.height = '100%'
  container.appendChild(mapContainer)

  // Initialize maplibre map
  const map = new maplibregl.Map({
    container: mapContainer,
    style: mapStyle,
    center: [0, 0],
    dragRotate: false,
    touchZoomRotate: { around: 'center' },
    canvasContextAttributes: { preserveDrawingBuffer: true },
  })

  // Disable map rotation
  map.dragRotate.disable()
  map.touchZoomRotate.disableRotation()

  // Track state
  let layout: Layout<Graph<BoardGameNodeData, BoardGameLinkData>> | undefined = undefined
  const graph = subgraphInfo.graph
  let isDisposed = false
  let layoutSteps = 400
  let layoutAnimationFrame: number | undefined = undefined
  let lastSelectedNode: number | undefined = undefined
  const nodesGeoJSON = {
    type: 'FeatureCollection',
    features: [],
  } as GeoJSON.FeatureCollection<GeoJSON.Point>
  let linksLayer: AddLayerObject | null = null
  let firstTimeLayout = true

  // Set up maplibre sources and layers once map is loaded
  map.on('load', () => {
    // Add nodes source
    map.addSource('nodes', {
      type: 'geojson',
      data: nodesGeoJSON,
    })

    // Add selected nodes source (for highlighted nodes)
    map.addSource('selected-nodes', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })
    map.addSource('graph-edges-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })
    const iconNames = ['circle', 'diamond', 'triangle', 'star']

    // Load all icons in parallel
    const iconPromises = iconNames.map(async (name) => {
      const image = await map.loadImage(config.iconSource + `/${name}.png`)
      map.addImage(`${name}-icon`, image.data, { sdf: true })
    })

    void Promise.all(iconPromises).then(() => {
      // Icons are loaded, now we can add the layer
    })

    // Add circle layer for all nodes
    map.addLayer({
      id: 'nodes',
      type: 'symbol',
      source: 'nodes',
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
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5,
          ['+', ['*', ['min', ['to-number', ['get', 'size']], 0.05], 1], 0.2],
          15,
          ['+', ['*', ['min', ['to-number', ['get', 'size']], 0.05], 15], 0.2],
        ],
        'icon-ignore-placement': true,
        'icon-allow-overlap': true,
      },
      paint: {
        'icon-color': [
          'case',
          ['>=', ['to-number', ['get', 'ratings']], 7.609174],
          '#00aaff',
          ['>=', ['to-number', ['get', 'ratings']], 7.204706],
          '#00ffee',
          ['>=', ['to-number', ['get', 'ratings']], 6.918946],
          '#00ff88',
          ['>=', ['to-number', ['get', 'ratings']], 6.65909],
          '#88ff00',
          ['>=', ['to-number', ['get', 'ratings']], 6.42297],
          '#ccff00',
          ['>=', ['to-number', ['get', 'ratings']], 6.18157],
          '#ffff00',
          ['>=', ['to-number', ['get', 'ratings']], 5.900366],
          '#ffcc00',
          ['>=', ['to-number', ['get', 'ratings']], 5.565964],
          '#ff8800',
          ['>=', ['to-number', ['get', 'ratings']], 5.07692],
          '#ff4400',
          '#ff0000',
        ],
      },
    })

    // Add invisible larger circles for easier touch interaction
    map.addLayer({
      id: 'nodes-touch-target',
      type: 'circle',
      source: 'nodes',
      paint: {
        'circle-color': 'transparent',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 12, 23, 24],
      },
    })

    // // Add highlighted nodes layer (selected node and its neighbors)
    // map.addLayer({
    //   id: 'selected-nodes-layer',
    //   type: 'circle',
    //   source: 'selected-nodes',
    //   paint: {
    //     'circle-color': ['get', 'color'],
    //   },
    // })

    // Add regular labels layer
    map.addLayer({
      id: 'node-labels',
      type: 'symbol',
      source: 'nodes',
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Roboto Condensed Regular'],
        'text-anchor': 'top',
        'text-max-width': 10,
        'symbol-sort-key': ['-', 0, ['get', 'size']],
        'symbol-spacing': 500,
        'text-offset': [0, 0.5],
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, ['/', ['get', 'size'], 4], 10, ['+', ['get', 'size'], 8]],
      },
      paint: {
        'text-color': NODE_COLORS.textColor,
        'text-halo-color': NODE_COLORS.textHaloColor,
        'text-halo-width': NODE_COLORS.textHaloWidth,
      },
    })

    // Add highlighted labels layer
    map.addLayer({
      id: 'selected-nodes-labels-layer',
      type: 'symbol',
      source: 'selected-nodes',
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Roboto Condensed Regular'],
        'text-anchor': 'top',
        'text-max-width': 10,
        'symbol-sort-key': ['-', 0, ['get', 'textSize']],
        'symbol-spacing': 500,
        'text-offset': [0, 0.5],
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, ['/', ['get', 'size'], 4], 10, ['+', ['get', 'size'], 8]],
      },
      paint: {
        'text-color': '#fff',
        'text-halo-color': ['get', 'color'],
        'text-halo-width': 2,
      },
    })

    // Add custom layer for links
    linksLayer = {
      id: 'graph-edges',
      type: 'line',
      source: 'graph-edges-source',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2, // 2 pixels wide
        'line-opacity': 0.4,
      },
    }
    map.addLayer(linksLayer, 'nodes')

    // Set up click listener for node selection
    map.on('click', 'nodes-touch-target', (e) => handleNodeClick(e, subgraphInfo.onMapClicked))

    // Also set up hover effects for better feedback
    map.on('mouseenter', 'nodes-touch-target', () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'nodes-touch-target', () => {
      map.getCanvas().style.cursor = ''
    })

    // Initialize layout
    initializeLayout()
  })

  // Public API
  return {
    dispose() {
      disposeViewer()
    },
    stopLayout() {
      layoutSteps = 0

      subgraphInfo.onLayoutStatusChange(false)
    },
    resumeLayout() {
      layoutSteps = 400
      ;(map.getSource('nodes') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [],
      })
      ;(map.getSource('selected-nodes') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [],
      })
      if (!isDisposed && layout) {
        subgraphInfo.onLayoutStatusChange(true)

        if (!layoutAnimationFrame) {
          layoutAnimationFrame = requestAnimationFrame(runLayout)
        }
      }
    },
    handleCurrentProjectChange(projectName: number) {
      handleCurrentProjectChange(projectName)
    },
    getCoordinates(projectId: number) {
      return getCoordinates(projectId)
    },
  }

  // Initialize force-directed layout
  function initializeLayout() {
    // Dynamically import ngraph.forcelayout

    if (isDisposed) return

    layout = createLayout(graph, {
      timeStep: 0.5,
      springLength: 10,
      springCoefficient: 0.8,
      gravity: -12,
      dragCoefficient: 0.9,
    })

    // Pin the root node to improve stability
    const rootNode = graph.getNode(subgraphInfo.nodeId)
    if (rootNode) {
      layout.pinNode(rootNode, true)
    }

    // Initialize node positions
    layout.step()

    // Update the map with initial node positions
    updateNodesOnMap()

    // Start the layout animation

    layoutAnimationFrame = requestAnimationFrame(runLayout)
    // Select root node initially
    selectNode(subgraphInfo.nodeId)
  }

  // Run layout steps and update the visual representation
  function runLayout() {
    if (isDisposed || !layout) return

    const willStop = layoutSteps <= 1

    if (layoutSteps > 0) {
      layoutSteps--
      layout.step()
      updateNodesOnMap()
    }

    if (willStop) {
      subgraphInfo.onLayoutStatusChange(false)

      if (firstTimeLayout) {
        firstTimeLayout = false
        // need a timeout, because maplibre.isStyleLoaded() is not true immediately after we
        // modify the points.
        setTimeout(() => {
          selectNode(subgraphInfo.nodeId, true)
        }, 200)
      }
      layoutAnimationFrame = undefined
    } else {
      layoutAnimationFrame = requestAnimationFrame(runLayout)
    }
  }

  // Helper to create a link line between two nodes
  function createLinkLine(fromId: NodeId, toId: NodeId, color: string): LinkLine | null {
    const fromBody = layout?.getBody(fromId)
    const toBody = layout?.getBody(toId)
    if (!fromBody || !toBody) return null

    const fromMapCoords = convertLayoutToMapCoordinates(fromBody.pos)
    const toMapCoords = convertLayoutToMapCoordinates(toBody.pos)

    return {
      from: [fromMapCoords.lng, fromMapCoords.lat],
      to: [toMapCoords.lng, toMapCoords.lat],
      color,
    }
  }

  function updateNodesOnMap() {
    if (!layout || !map.isStyleLoaded()) return

    // Update the GeoJSON features with current layout positions
    const features: GeoJSON.Feature<GeoJSON.Point>[] = []
    // ;(map.getSource('graph-edges-source') as GeoJSONSource).setData({
    //   type: 'FeatureCollection',
    //   features: [],
    // })

    // Calculate node sizes based on connections
    const nodeSizes: { [key: string]: number } = {}
    graph.forEachNode((node) => {
      const linkCount = node.links?.size || 0

      // Base size on link count, with minimum of 3 and max of 10
      nodeSizes[node.id] = Math.max(3, Math.min(10, 3 + linkCount / 5))
    })

    graph.forEachNode((node) => {
      if (!layout?.getBody(node.id)) return // Skip if node not in layout

      const pos = layout.getNodePosition(node.id)
      const mapCoords = convertLayoutToMapCoordinates(pos)

      // Add node feature with size based on connections
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [mapCoords.lng, mapCoords.lat],
        },
        properties: {
          id: node.id,
          label: node.data.label,
          size: node.data.size,
          originalPos: { x: pos.x, y: pos.y }, // Store original position for edge rendering
          complexity: node.data.complexity || 0,
          ratings: node.data.rating || 0,
        },
      })
    })

    // Update edges
    const firstLevelLinks: LinkLine[] = []

    const lines: LinkLine[] = []
    graph.forEachLink((link) => {
      // Determine if this is a first-level link (connected to selected node)
      const isSelectedLink = lastSelectedNode && (link.fromId === lastSelectedNode || link.toId === lastSelectedNode)
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
      const line = createLinkLine(link.fromId, link.toId, isSelectedLink ? '#ffffff' : lineColor)

      if (!line) return

      // Collect first-level links separately to draw them last (on top)
      if (isSelectedLink) {
        firstLevelLinks.push(line)
      } else {
        lines.push(line)
      }
    })

    // Add first-level links after other links to ensure they're on top
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
    // Update the nodes source with new features
    nodesGeoJSON.features = features
    ;(map.getSource('nodes') as maplibregl.GeoJSONSource).setData(nodesGeoJSON)
    ;(map.getSource('graph-edges-source') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: GeoJSONLine,
    })
    // Fit map to nodes if first update
    if (features.length > 0 && !lastSelectedNode) {
      fitMapToNodes()
    }
  }

  // Handle node click
  function handleNodeClick(
    e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] },
    onMapClicked: (searchResult: SearchResult) => void,
  ) {
    if (!e.features || e.features.length === 0) return

    const nodeId = e.features[0].properties.id
    let selectedMapCoords = selectNode(nodeId, false)
    if (!selectedMapCoords) return
    let searchResult = {
      text: graph.getNode(nodeId)?.data.label ?? '',
      lat: selectedMapCoords.lat,
      lon: selectedMapCoords.lng,
      groupId: graph.getNode(nodeId)?.data.c ?? 0,
      id: graph.getNode(nodeId)?.data.id ?? 0,
      year: '0',
      selected: true,
      skipAnimation: false,
      html: null,
    }
    onMapClicked(searchResult)
  }

  // Helper to create a node feature for GeoJSON
  function createNodeFeature(nodeId: NodeId, properties = {}): GeoJSON.Feature<GeoJSON.Point> | null {
    if (!layout?.getBody(nodeId)) return null

    const pos = layout.getNodePosition(nodeId)
    const mapCoords = convertLayoutToMapCoordinates(pos)

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [mapCoords.lng, mapCoords.lat],
      },
      properties: {
        ...properties,
        id: nodeId,
        label: graph.getNode(nodeId)?.data.label, // For label display
      },
    }
  }

  // Select a node and update visual highlighting
  function selectNode(nodeId: number, bringToView = true) {
    if (!map.isStyleLoaded() || !layout || nodeId === lastSelectedNode) {
      return
    }

    // Create highlighted nodes data
    const highlightedNodes: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: [],
    }

    // Get the selected node position
    const selectedPos = layout.getBody(nodeId)?.pos
    if (!selectedPos) return // Node not in layout yet

    // Add the primary selected node
    const selectedFeature = createNodeFeature(nodeId, {
      color: NODE_COLORS.selected,
      textSize: 1.2,
      size: 8,
    })

    if (selectedFeature) {
      highlightedNodes.features.push(selectedFeature)
    }

    // Update edges in the custom layer
    // ;(map.getSource('graph-edges-source') as GeoJSONSource).setData({
    //   type: 'FeatureCollection',
    //   features: [],
    // })
    const firstLevelLinks: { from: [number, number]; to: [number, number]; color: string }[] = []

    // Find and highlight neighbors of the selected node
    graph.forEachLinkedNode(
      nodeId,
      (linkedNode) => {
        if (!layout?.getBody(linkedNode.id)) return

        // Add neighbor node to highlighted features
        const neighborFeature = createNodeFeature(linkedNode.id, {
          color: NODE_COLORS.neighbor,
          textSize: 1.0,
          size: 6,
        })

        if (neighborFeature) {
          highlightedNodes.features.push(neighborFeature)
        }

        // Add first-level connection
        const line = createLinkLine(nodeId, linkedNode.id, '#ffffff') // Bright white for direct connections
        if (line) {
          firstLevelLinks.push(line)
        }
      },
      false,
    )
    const lines: LinkLine[] = []
    // Draw all other connections (non-highlighted)
    graph.forEachLink((link) => {
      if (!layout?.getBody(link.fromId) || !layout.getBody(link.toId)) return
      // Skip links connected to selected node as they're already handled
      if (link.fromId === nodeId || link.toId === nodeId) return
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
      const line = createLinkLine(link.fromId, link.toId, lineColor) // Semi-transparent for background connections
      if (line) lines.push(line)
    })

    // Add the selected node and neighbors to the map
    ;(map.getSource('selected-nodes') as maplibregl.GeoJSONSource).setData(highlightedNodes)

    // Update the links layer with the new lines
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
    // Update the nodes source with new features
    ;(map.getSource('graph-edges-source') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: GeoJSONLine,
    })
    lastSelectedNode = nodeId

    const selectedMapCoords = convertLayoutToMapCoordinates(selectedPos)
    if (bringToView) {
      map.flyTo({ center: [selectedMapCoords.lng, selectedMapCoords.lat] })
    }
    return selectedMapCoords
  }

  // Fit the map to the bounds of the current nodes
  function fitMapToNodes() {
    if (!layout || isDisposed) return

    const bounds = calculateBounds()
    if (!bounds) return

    map.fitBounds(bounds, {
      padding: 20,
      duration: 500,
    })
  }

  // Calculate the bounds for all current nodes in the viewer
  function calculateBounds(): LngLatBoundsLike | null {
    if (!layout || isDisposed) return null

    let minLng = Infinity
    let minLat = Infinity
    let maxLng = -Infinity
    let maxLat = -Infinity

    graph.forEachNode((node) => {
      if (!layout?.getBody(node.id)) return // Skip if node not in layout

      const pos = layout.getNodePosition(node.id)
      const mapCoords = convertLayoutToMapCoordinates(pos)

      if (mapCoords.lng < minLng) minLng = mapCoords.lng
      if (mapCoords.lat < minLat) minLat = mapCoords.lat
      if (mapCoords.lng > maxLng) maxLng = mapCoords.lng
      if (mapCoords.lat > maxLat) maxLat = mapCoords.lat
    })

    if (minLng === Infinity || minLat === Infinity || maxLng === -Infinity || maxLat === -Infinity) {
      return null // No valid nodes to calculate bounds
    }

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ]
  }

  // Dispose the viewer and clean up resources
  function disposeViewer() {
    isDisposed = true

    if (layoutAnimationFrame) {
      cancelAnimationFrame(layoutAnimationFrame)
      layoutAnimationFrame = undefined
    }

    map.remove()

    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    container.classList.remove('active')
  }

  function handleCurrentProjectChange(projectId: number) {
    // Check if projectId exists in our graph
    if (projectId === undefined || !layout?.getBody(projectId)) return

    // Select the node
    selectNode(projectId)
  }

  function getCoordinates(nodeId: number): SearchResult | undefined {
    if (nodeId === undefined || !layout?.getBody(nodeId)) return
    const node = graph.getNode(nodeId)
    if (node === undefined) return
    // Get the selected node position
    const selectedPos = layout.getBody(nodeId)?.pos
    if (!selectedPos) return // Node not in layout yet
    const selectedMapCoords = convertLayoutToMapCoordinates(selectedPos)
    return {
      text: node.data.label,
      lat: selectedMapCoords.lat,
      lon: selectedMapCoords.lng,
      groupId: node.data.c,
      id: node.data.id,
      selected: false,
      skipAnimation: false,
      html: null,
      year: '',
    }
  }
}
