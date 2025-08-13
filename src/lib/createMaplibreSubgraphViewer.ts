import maplibregl, { type CustomLayerInterface } from 'maplibre-gl'
import bus from './bus'
import { getCustomLayer } from './gl/createLinesCollection.js'
import config from './config'
import getColorTheme from './getColorTheme'
import getComplimentaryColor from './getComplimentaryColor'
import { type Layout } from 'ngraph.forcelayout'
import type { Graph } from 'ngraph.graph'
import createLayout from 'ngraph.forcelayout'
import type { BoardGameLinkData, BoardGameNodeData } from './fetchAndProcessGraph.js'
const currentColorTheme = getColorTheme()

// Default map style configuration for subgraph viewer
const mapStyle = {
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
  container: Element | null
  graph: Graph<BoardGameNodeData, BoardGameLinkData>
  onLayoutStatusChange: (arg0: boolean) => void
  nodeId: string
}) {
  const container = subgraphInfo.container //document.querySelector('.subgraph-viewer')
  if (!container) {
    throw new Error('Subgraph viewer container not found')
  }
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
  const complimentaryLinkColor = getComplimentaryColor(currentColorTheme.background)

  // Initialize maplibre map
  const map = new maplibregl.Map({
    container: mapContainer,
    style: mapStyle,
    center: [0, 0],
    dragRotate: false,
    touchZoomRotate: { around: 'center' },
    preserveDrawingBuffer: true,
  })

  // Disable map rotation
  map.dragRotate.disable()
  map.touchZoomRotate.disableRotation()

  // Track state
  let layout: Layout<Graph<string, string>> | undefined = undefined
  const graph = subgraphInfo.graph
  let isDisposed = false
  let layoutSteps = 400
  let layoutAnimationFrame: number | undefined = undefined
  let lastSelectedNode: string | undefined = undefined
  const nodesGeoJSON = createEmptyFeatureCollection()
  let linksLayer: getCustomLayer | null = null
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
          ['+', ['*', ['min', ['to-number', ['get', 'size']], 0.05], 10], 0.2],
          15,
          ['+', ['*', ['min', ['to-number', ['get', 'size']], 0.05], 150], 0.2],
        ],
        'icon-ignore-placement': true,
        'icon-allow-overlap': true,
      },
      paint: {
        'icon-color': [
          'case',
          ['>=', ['to-number', ['get', 'ratings']], 7.77],
          '#00e9ff',
          ['>=', ['to-number', ['get', 'ratings']], 7.46],
          '#00f8d8',
          ['>=', ['to-number', ['get', 'ratings']], 7.2],
          '#00ff83',
          ['>=', ['to-number', ['get', 'ratings']], 7.03],
          '#62f25e',
          ['>=', ['to-number', ['get', 'ratings']], 6.9],
          '#87e539',
          ['>=', ['to-number', ['get', 'ratings']], 6.76],
          '#a2d600',
          ['>=', ['to-number', ['get', 'ratings']], 6.6],
          '#c3b700',
          ['>=', ['to-number', ['get', 'ratings']], 6.4],
          '#de9200',
          ['>=', ['to-number', ['get', 'ratings']], 6.1],
          '#f36300',
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

    // Add highlighted nodes layer (selected node and its neighbors)
    map.addLayer({
      id: 'selected-nodes-layer',
      type: 'circle',
      source: 'selected-nodes',
      paint: {
        'circle-color': ['get', 'color'],
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
        'text-field': ['get', 'name'],
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
    linksLayer = new getCustomLayer('graph-links')
    map.addLayer(linksLayer, 'nodes')

    // Set up click listener for node selection
    map.on('click', 'nodes-touch-target', handleNodeClick)

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

  // Listener for current project changes to sync selections
  bus.on('current-project', handleCurrentProjectChange)

  // Public API
  return {
    dispose() {
      disposeViewer()
    },
    stopLayout() {
      layoutSteps = 0
      if (subgraphInfo.onLayoutStatusChange) {
        subgraphInfo.onLayoutStatusChange(false)
      }
    },
    resumeLayout() {
      layoutSteps = 400
      if (!isDisposed && layout) {
        if (subgraphInfo.onLayoutStatusChange) {
          subgraphInfo.onLayoutStatusChange(true)
        }
        if (!layoutAnimationFrame) {
          layoutAnimationFrame = requestAnimationFrame(runLayout)
        }
      }
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
    if (!isDisposed) {
      layoutAnimationFrame = requestAnimationFrame(runLayout)
      // Select root node initially
      selectNode(subgraphInfo.nodeId)
    }
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
      if (subgraphInfo.onLayoutStatusChange) {
        subgraphInfo.onLayoutStatusChange(false)
      }
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
  function createLinkLine(fromId: string, toId: string, color: number) {
    if (!layout.getBody(fromId) || !layout.getBody(toId)) return null

    const fromPos = layout.getNodePosition(fromId)
    const toPos = layout.getNodePosition(toId)

    // Convert layout coordinates to map coordinates
    const fromMapCoords = convertLayoutToMapCoordinates(fromPos)
    const toMapCoords = convertLayoutToMapCoordinates(toPos)

    // Convert to mercator coordinates for the custom layer
    const from = maplibregl.MercatorCoordinate.fromLngLat(fromMapCoords)
    const to = maplibregl.MercatorCoordinate.fromLngLat(toMapCoords)

    return {
      from: [from.x, from.y],
      to: [to.x, to.y],
      color: color,
    }
  }

  // Update node and edge positions on the map
  function updateNodesOnMap() {
    if (!layout || !map.isStyleLoaded()) return

    // Update the GeoJSON features with current layout positions
    const features: GeoJSON.Feature<GeoJSON.Point>[] = []
    linksLayer?.clear()

    // Calculate node sizes based on connections
    const nodeSizes = {}
    graph.forEachNode((node) => {
      const linkCount = node.links?.size || 0

      // Base size on link count, with minimum of 3 and max of 10
      nodeSizes[node.id] = Math.max(3, Math.min(10, 3 + linkCount / 5))
    })

    graph.forEachNode((node) => {
      if (!layout.getBody(node.id)) return // Skip if node not in layout

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
          label: getLabelFromName(node.id),
          size: node.data.size,
          originalPos: { x: pos.x, y: pos.y }, // Store original position for edge rendering
          complexity: node.data.complexity || 0,
          ratings: node.data.rating || 0,
        },
      })
    })

    // Update edges
    const firstLevelLinks = []

    graph.forEachLink((link) => {
      // Determine if this is a first-level link (connected to selected node)
      const isSelectedLink = lastSelectedNode && (link.fromId === lastSelectedNode || link.toId === lastSelectedNode)

      const line = createLinkLine(link.fromId, link.toId, isSelectedLink ? 0xffffffff : complimentaryLinkColor)

      if (!line) return

      // Collect first-level links separately to draw them last (on top)
      if (isSelectedLink) {
        firstLevelLinks.push(line)
      } else {
        linksLayer.addLine(line)
      }
    })

    // Add first-level links after other links to ensure they're on top
    firstLevelLinks.forEach((line) => {
      linksLayer.addLine(line)
    })

    // Update the nodes source with new features
    nodesGeoJSON.features = features
    map.getSource('nodes').setData(nodesGeoJSON)

    // Fit map to nodes if first update
    if (features.length > 0 && !lastSelectedNode) {
      fitMapToNodes()
    }
  }

  // Helper function to get shorter label from full name
  function getLabelFromName(fullName: string) {
    const parts = fullName.split('/')
    return parts.length > 1 ? parts[parts.length - 1] : fullName
  }

  // Handle node click
  function handleNodeClick(e) {
    if (!e.features || e.features.length === 0) return

    const nodeId = e.features[0].properties.id
    selectNode(nodeId, false)
  }

  // Helper to create a node feature for GeoJSON
  function createNodeFeature(nodeId: string, properties = {}): GeoJSON.Feature<GeoJSON.Point> | null {
    if (!layout.getBody(nodeId)) return null

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
        name: nodeId, // For label display
      },
    }
  }

  // Select a node and update visual highlighting
  function selectNode(nodeId, bringToView = true) {
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
    linksLayer.clear()
    const firstLevelLinks = []

    // Find and highlight neighbors of the selected node
    graph.forEachLinkedNode(nodeId, (linkedNode) => {
      if (!layout.getBody(linkedNode.id)) return

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
      const line = createLinkLine(nodeId, linkedNode.id, 0xffffffff) // Bright white for direct connections
      if (line) {
        firstLevelLinks.push(line)
      }
    })

    // Draw all other connections (non-highlighted)
    graph.forEachLink((link) => {
      if (!layout.getBody(link.fromId) || !layout.getBody(link.toId)) return
      // Skip links connected to selected node as they're already handled
      if (link.fromId === nodeId || link.toId === nodeId) return

      const line = createLinkLine(link.fromId, link.toId, complimentaryLinkColor) // Semi-transparent for background connections
      if (line) linksLayer.addLine(line)
    })

    // Add the selected node and neighbors to the map
    map.getSource('selected-nodes').setData(highlightedNodes)

    // Update the links layer with the new lines
    firstLevelLinks.forEach((line) => {
      linksLayer.addLine(line)
    })

    lastSelectedNode = nodeId

    const selectedMapCoords = convertLayoutToMapCoordinates(selectedPos)
    if (bringToView) {
      map.flyTo({ center: [selectedMapCoords.lng, selectedMapCoords.lat] })
    }
    bus.fire(
      'repo-selected',
      {
        text: nodeId,
        lat: selectedMapCoords.lat,
        lon: selectedMapCoords.lng,
        groupId: graph.getNode(nodeId)?.data.c,
        id: graph.getNode(nodeId)?.data.id,
      },
      !bringToView,
    )
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
  function calculateBounds(): number[][] | null {
    if (!layout || isDisposed) return null

    let minLng = Infinity
    let minLat = Infinity
    let maxLng = -Infinity
    let maxLat = -Infinity

    graph.forEachNode((node) => {
      if (!layout.getBody(node.id)) return // Skip if node not in layout

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

    bus.off('current-project', handleCurrentProjectChange)

    if (map) {
      map.remove()
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    container.classList.remove('active')
  }

  function handleCurrentProjectChange(projectName: string) {
    if (projectName === lastSelectedNode || !layout) return

    // Check if projectName exists in our graph
    if (!layout.getBody(projectName)) return

    // Select the node
    selectNode(projectName)
  }
}

function createEmptyFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: [],
  }
}
