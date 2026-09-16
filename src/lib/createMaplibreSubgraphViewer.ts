import * as maplibregl from 'maplibre-gl'
import { GeoJSONSource, type AddLayerObject, type LngLatBoundsLike, type StyleSpecification } from 'maplibre-gl'
import config from './config'
import getColorTheme from './getColorTheme'
import type { Graph, NodeId } from 'ngraph.graph'
import type { BoardGameLinkData, BoardGameNodeData } from './fetchAndProcessGraph.js'
import type { SearchResult } from './createFuzzySearcher.js'
import { ICON_IMAGE_BY_COMPLEXITY, ICON_COLOR_BY_RATING, GRAPH_EDGES_PAINT, getLineColorForWeight, linesToGeoJSON, emptyFeatureCollection } from './mapStyleExpressions'
import { ForceLayoutEngine } from './forceLayoutEngine'
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
  const graph = subgraphInfo.graph
  let isDisposed = false
  let lastSelectedNode: number | undefined = undefined
  const nodesGeoJSON = emptyFeatureCollection() as GeoJSON.FeatureCollection<GeoJSON.Point>
  let linksLayer: AddLayerObject | null = null

  const layoutEngine = new ForceLayoutEngine(graph, {
    onStep: updateNodesOnMap,
    onSettled: () => { selectNode(subgraphInfo.nodeId, true); },
    onStatusChange: subgraphInfo.onLayoutStatusChange,
  })

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
      data: emptyFeatureCollection(),
    })
    map.addSource('graph-edges-source', {
      type: 'geojson',
      data: emptyFeatureCollection(),
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
        'icon-image': ICON_IMAGE_BY_COMPLEXITY,
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
        'icon-color': ICON_COLOR_BY_RATING,
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
      paint: GRAPH_EDGES_PAINT,
    }
    map.addLayer(linksLayer, 'nodes')

    // Set up click listener for node selection
    map.on('click', 'nodes-touch-target', (e) => { handleNodeClick(e, subgraphInfo.onMapClicked); })

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
      layoutEngine.stop()
      subgraphInfo.onLayoutStatusChange(false)
    },
    resumeLayout() {
      void (map.getSource('nodes') as maplibregl.GeoJSONSource).setData(emptyFeatureCollection())
      void (map.getSource('selected-nodes') as maplibregl.GeoJSONSource).setData(emptyFeatureCollection())
      layoutEngine.resume()
    },
    handleCurrentProjectChange(projectName: number) {
      handleCurrentProjectChange(projectName)
    },
    getCoordinates(projectId: number) {
      return getCoordinates(projectId)
    },
  }

  // Initialize force-directed layout and select the root node
  function initializeLayout() {
    if (isDisposed) return

    layoutEngine.start(subgraphInfo.nodeId)
    selectNode(subgraphInfo.nodeId)
  }

  // Helper to create a link line between two nodes
  function createLinkLine(fromId: NodeId, toId: NodeId, color: string): LinkLine | null {
    const fromBody = layoutEngine.getBody(fromId)
    const toBody = layoutEngine.getBody(toId)
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
    if (!layoutEngine.isReady() || !map.isStyleLoaded()) return

    // Update the GeoJSON features with current layout positions
    const features: GeoJSON.Feature<GeoJSON.Point>[] = []

    // Calculate node sizes based on connections
    const nodeSizes: { [key: string]: number } = {}
    graph.forEachNode((node) => {
      const linkCount = node.links?.size || 0

      // Base size on link count, with minimum of 3 and max of 10
      nodeSizes[node.id] = Math.max(3, Math.min(10, 3 + linkCount / 5))
    })

    graph.forEachNode((node) => {
      const body = layoutEngine.getBody(node.id)
      if (!body) return // Skip if node not in layout

      const mapCoords = convertLayoutToMapCoordinates(body.pos)

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
          originalPos: { x: body.pos.x, y: body.pos.y }, // Store original position for edge rendering
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
      const lineColor = getLineColorForWeight(link.data.weight)
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
    // Update the nodes source with new features
    nodesGeoJSON.features = features
    void (map.getSource('nodes') as maplibregl.GeoJSONSource).setData(nodesGeoJSON)
    void (map.getSource('graph-edges-source') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: linesToGeoJSON(lines),
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
    const selectedMapCoords = selectNode(nodeId, false)
    if (!selectedMapCoords) return
    const searchResult = {
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
    const body = layoutEngine.getBody(nodeId)
    if (!body) return null

    const mapCoords = convertLayoutToMapCoordinates(body.pos)

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
    if (!map.isStyleLoaded() || !layoutEngine.isReady() || nodeId === lastSelectedNode) {
      return
    }

    // Create highlighted nodes data
    const highlightedNodes = emptyFeatureCollection() as GeoJSON.FeatureCollection<GeoJSON.Point>

    // Get the selected node position
    const selectedPos = layoutEngine.getBody(nodeId)?.pos
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

    const firstLevelLinks: { from: [number, number]; to: [number, number]; color: string }[] = []

    // Find and highlight neighbors of the selected node
    graph.forEachLinkedNode(
      nodeId,
      (linkedNode) => {
        if (!layoutEngine.getBody(linkedNode.id)) return

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
      if (!layoutEngine.getBody(link.fromId) || !layoutEngine.getBody(link.toId)) return
      // Skip links connected to selected node as they're already handled
      if (link.fromId === nodeId || link.toId === nodeId) return
      const lineColor = getLineColorForWeight(link.data.weight)
      const line = createLinkLine(link.fromId, link.toId, lineColor) // Semi-transparent for background connections
      if (line) lines.push(line)
    })

    // Add the selected node and neighbors to the map
    void (map.getSource('selected-nodes') as maplibregl.GeoJSONSource).setData(highlightedNodes)

    // Update the links layer with the new lines
    firstLevelLinks.forEach((line) => {
      lines.push(line)
    })
    // Update the nodes source with new features
    void (map.getSource('graph-edges-source') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: linesToGeoJSON(lines),
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
    if (!layoutEngine.isReady() || isDisposed) return

    const bounds = calculateBounds()
    if (!bounds) return

    map.fitBounds(bounds, {
      padding: 20,
      duration: 500,
    })
  }

  // Calculate the bounds for all current nodes in the viewer
  function calculateBounds(): LngLatBoundsLike | null {
    if (!layoutEngine.isReady() || isDisposed) return null

    let minLng = Infinity
    let minLat = Infinity
    let maxLng = -Infinity
    let maxLat = -Infinity

    graph.forEachNode((node) => {
      const body = layoutEngine.getBody(node.id)
      if (!body) return // Skip if node not in layout

      const mapCoords = convertLayoutToMapCoordinates(body.pos)

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
    layoutEngine.dispose()

    map.remove()

    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    container.classList.remove('active')
  }

  function handleCurrentProjectChange(projectId: number) {
    // Check if projectId exists in our graph
    if (!layoutEngine.getBody(projectId)) return

    // Select the node
    selectNode(projectId)
  }

  function getCoordinates(nodeId: number): SearchResult | undefined {
    if (!layoutEngine.getBody(nodeId)) return
    const node = graph.getNode(nodeId)
    if (node === undefined) return
    // Get the selected node position
    const selectedPos = layoutEngine.getBody(nodeId)?.pos
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
