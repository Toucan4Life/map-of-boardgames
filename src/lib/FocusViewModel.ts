import type { Graph, NodeId } from 'ngraph.graph'
import downloadGroupGraph, { buildLocalNeighborsGraphForGroup } from './downloadGroupGraph'
import { createMaplibreSubgraphViewer } from './createMaplibreSubgraphViewer'
import type { BoardGameLinkData, BoardGameNodeData } from './fetchAndProcessGraph'
import type { TreeItem } from '@/components/TreeView.vue'

// Static reference to maintain single instance
interface ActiveSubgraphViewer {
  dispose(): void
  resumeLayout(): void
  stopLayout(): void
}

let activeSubgraphViewer: ActiveSubgraphViewer | undefined = undefined
export interface Repositories {
  isExternal: boolean
  name: NodeId | undefined
  lngLat: [number, number]
  // isExternal: boolean
  id: number
  linkWeight: number
}

export interface IFocusViewModel {
  currentLog: string
  logMessages: string[]
  goBackToDirectConnections(): unknown
  setLayout(arg0: boolean): unknown
  expandGraph(): unknown
  expandingGraph: boolean
  layoutRunning: boolean
  graphData: TreeItem | undefined
  name: string
  repos: Repositories[]
  lngLat: [number, number]
  loading: boolean
  id: number | undefined
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
  constructor(repositoryId: number, groupId: number, label: string) {
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
    downloadGroupGraph(groupId)
      .then((graph) => {
        this.loading = false
        const neighbors: Repositories[] = []
        this.lngLat = graph.getNode(label)?.data.lnglat || [0, 0]
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
              isExternal: !!link.data.e,
              id: parseInt(node.data.id.toString(), 10),
              linkWeight: link.data.weight,
            })
          },
          false,
        )
        neighbors.sort((a, b) => b.linkWeight - a.linkWeight)

        this.repos = neighbors.slice(0, 25)
      })
      .catch((err) => {
        this.loading = false
        console.error('Failed to initialize FocusViewModel:', err)
      })
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
  async expandGraph() {
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
        throw new Error('Repository ID is undefined and cannot be used to expand graph.')
      }
      const graph = await buildLocalNeighborsGraphForGroup(groupId, this.id, depth, logCallback)
      logCallback('Graph data received, building tree view...')

      // Convert graph to tree view
      this.graphData = this.toTreeView(graph, this.id, depth)

      // Dispose existing viewer if any
      this.disposeSubgraphViewer()

      // Create the new subgraph viewer
      const containerEl = document.querySelector<HTMLElement>('.subgraph-viewer')
      if (!containerEl) {
        throw new Error('Subgraph viewer container not found in DOM')
      }
      if (bggId === undefined) {
        throw new Error('Repository ID is undefined and cannot be used to expand graph.')
      }
      activeSubgraphViewer = createMaplibreSubgraphViewer({
        container: containerEl,
        graph,
        nodeId: bggId,
        onLayoutStatusChange: (isRunning: boolean) => {
          this.layoutRunning = isRunning
        },
      })

      // Set initial layout status
      this.layoutRunning = true
    } catch (err) {
      console.error('Failed to expand graph:', err)
    } finally {
      this.expandingGraph = false
    }
  }

  toTreeView(graph: Graph<BoardGameNodeData, BoardGameLinkData>, startNodeId: number, depth = 2): TreeItem {
    const rootGraphNode = graph.getNode(startNodeId)
    if (!rootGraphNode) {
      // Return a minimal tree structure if the start node isn't found
      return {
        node: {
          id: startNodeId,
          label: startNodeId.toString() + ' (not found)',
          isExternal: false,
          lnglat: [0, 0],
          max_players: '0',
          l: '',
          c: 0,
          rating: '',
          complexity: '',
          size: '',
        },
        children: [],
      }
    }

    const rootNodeData = rootGraphNode.data

    // Helper function to recursively build the tree for children
    // parentNodeId: The ID of the node whose children are being fetched.
    // parentDepthInTree: The depth of parentNodeId in the tree (startNodeId is at 0).
    // path: Set of ancestor IDs in the current traversal path to avoid cycles.
    function getChildrenRecursive(parentNodeId: NodeId, parentDepthInTree: number, path: Set<NodeId>): TreeItem[] {
      if (parentDepthInTree >= depth) {
        return []
      }

      // Add current node to path
      path.add(parentNodeId)

      const childNodes: TreeItem[] = []

      graph.forEachLinkedNode(
        parentNodeId,
        (linkedGraphNode, linkedGraphLink) => {
          if (path.has(linkedGraphNode.id)) {
            return
          }

          // Create a copy of the node data
          const childData = { ...linkedGraphNode.data }

          // Use the same path Set (current node already added above)
          const grandChildren = getChildrenRecursive(linkedGraphNode.id, parentDepthInTree + 1, path)
          childNodes.push({ node: childData, children: grandChildren, linkWeight: linkedGraphLink.data.weight })
        },
        false,
      )

      // Remove current node from path when backtracking
      path.delete(parentNodeId)

      childNodes.sort((a, b) => (b.linkWeight ?? 0) - (a.linkWeight ?? 0))
      return childNodes.slice(0, 25)
    }
    // Initial path for recursion, containing only the startNodeId.
    const initialPath = new Set<number>()
    initialPath.add(startNodeId)

    // Fetch children for the root node (startNodeId, which is at depth 0).
    const rootChildren = getChildrenRecursive(startNodeId, 0, initialPath)

    return { node: rootNodeData, children: rootChildren }
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
