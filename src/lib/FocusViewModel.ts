import type { Graph, NodeId } from 'ngraph.graph'
import { buildLocalNeighborsGraphForGroup } from './buildLocalNeighborsGraph'
import { buildTreeView } from './buildTreeView'
import { createMaplibreSubgraphViewer } from './createMaplibreSubgraphViewer'
import type { BoardGameLinkData, BoardGameNodeData } from './fetchAndProcessGraph'
import type { SearchResult } from './createFuzzySearcher'

// Static reference to maintain single instance
interface ActiveSubgraphViewer {
  dispose(): void
  resumeLayout(): void
  stopLayout(): void
  handleCurrentProjectChange(projectName: number): void
  getCoordinates(projectId: number): SearchResult | undefined
}

let activeSubgraphViewer: ActiveSubgraphViewer | undefined = undefined
export interface Repositories {
  isExternal: boolean
  name: NodeId | undefined
  lngLat: [number, number]
  id: number
  linkWeight: number
  groupId?: number
}
export interface TreeItem {
  node: BoardGameNodeData
  children?: TreeItem[]
  linkWeight?: number
}
export interface IFocusViewModel {
  currentLog: string
  logMessages: string[]
  goBackToDirectConnections(): unknown
  setLayout(arg0: boolean): unknown
  expandGraph(onMapClicked: (searchResult: SearchResult) => void): unknown
  expandingGraph: boolean
  layoutRunning: boolean
  graphData: TreeItem | undefined
  name: string
  repos: Repositories[]
  lngLat: [number, number]
  loading: boolean
  id: number | undefined
  groupId: number
  handleCurrentProjectChange(projectName: number): void
}
/**
 * This view model is used to show direct neighbors of a node. It can be extended
 * to pull second layer neighbors as well and then perform layout on them.
 */
export class FocusViewModel implements IFocusViewModel {
  name: string
  repos: Repositories[]
  lngLat: [number, number]
  loading: boolean
  id: number | undefined
  groupId: number
  constructor(repositoryId: number, groupId: number, label: string, graph: Graph<BoardGameNodeData, BoardGameLinkData>) {
    this.name = label
    this.repos = []
    this.lngLat = [0, 0]
    this.id = repositoryId
    this.loading = true
    this.groupId = groupId
    this.expandingGraph = false
    this.graphData = undefined
    this.layoutRunning = false
    this.logMessages = []
    this.currentLog = ''
    this.loading = false
    const neighbors: Repositories[] = []
    this.lngLat = graph.getNode(repositoryId)?.data.lnglat || [0, 0]
    const seen = new Set()
    graph.forEachLinkedNode(
      repositoryId,
      (node, link) => {
        if (seen.has(node.id)) {
          return
        }
        seen.add(node.id)
        neighbors.push({
          name: node.data.label,
          lngLat: node.data.lnglat,
          isExternal: link.data.e,
          id: parseInt(node.data.id.toString(), 10),
          linkWeight: link.data.weight,
          groupId: node.data.c,
        })
      },
      false,
    )
    neighbors.sort((a, b) => b.linkWeight - a.linkWeight)

    this.repos = neighbors.slice(0, 25)
  }
  handleCurrentProjectChange(projectName: number): void {
    // If the subgraph viewer exists, notify it of the project change
    if (activeSubgraphViewer) {
      activeSubgraphViewer.handleCurrentProjectChange(projectName)
    }
  }
  getCoordinates(projectId: number): SearchResult | undefined {
    return activeSubgraphViewer?.getCoordinates(projectId)
  }
  expandingGraph: boolean
  layoutRunning: boolean
  graphData: TreeItem | undefined
  currentLog: string
  logMessages: string[]
  // Return to direct connections view
  goBackToDirectConnections() {
    this.graphData = undefined
    this.disposeSubgraphViewer()
  }
  setLayout(isRunning: boolean) {
    if (!activeSubgraphViewer) return

    if (isRunning) {
      activeSubgraphViewer.resumeLayout()
    } else {
      activeSubgraphViewer.stopLayout()
    }

    this.layoutRunning = isRunning
  }
  async expandGraph(onMapClickedd: (searchResult: SearchResult) => void) {
    if (this.expandingGraph) return // Prevent multiple clicks

    this.expandingGraph = true
    this.logMessages = []
    this.currentLog = ''

    try {
      const bggId = this.id
      const groupId = this.groupId

      // Depth of 2 gives immediate neighbors and their neighbors
      const depth = 2

      // Create a log callback to update progress
      const logCallback = (message: string) => {
        const timestamp = new Date().toISOString().substring(11, 19)
        const formattedMessage = `[${timestamp}] ${message}`
        this.currentLog = formattedMessage
        this.logMessages = [...this.logMessages, formattedMessage].slice(-50) // Keep most recent 50 messages
      }

      logCallback('Starting graph expansion...')
      if (this.id === undefined) {
        console.error('Repository ID is undefined and cannot be used to expand graph.')
        return
      }
      const graph = await buildLocalNeighborsGraphForGroup(groupId, this.id, depth, logCallback)
      if (!graph) {
        logCallback('Graph expansion failed.')
        return
      }
      logCallback('Graph data received, building tree view...')

      // Convert graph to tree view
      this.graphData = buildTreeView(graph, this.id, depth)

      // Dispose existing viewer if any
      this.disposeSubgraphViewer()

      // Create the new subgraph viewer
      const containerEl = document.querySelector<HTMLElement>('.subgraph-viewer')
      if (!containerEl) {
        console.error('Subgraph viewer container not found in DOM')
        return
      }
      if (bggId === undefined) {
        console.error('Repository ID is undefined and cannot be used to expand graph.')
        return
      }
      activeSubgraphViewer = createMaplibreSubgraphViewer({
        container: containerEl,
        graph,
        nodeId: bggId,
        onLayoutStatusChange: (isRunning: boolean) => {
          this.layoutRunning = isRunning
        },
        onMapClicked: onMapClickedd,
      })

      // Set initial layout status
      this.layoutRunning = true
    } catch (err) {
      console.error('Failed to expand graph:', err)
    } finally {
      this.expandingGraph = false
    }
  }

  // Dispose subgraph viewer if it exists
  disposeSubgraphViewer() {
    if (activeSubgraphViewer) {
      activeSubgraphViewer.dispose()
      activeSubgraphViewer = undefined
    }
  }

  dispose() {
    this.disposeSubgraphViewer()
  }
}
