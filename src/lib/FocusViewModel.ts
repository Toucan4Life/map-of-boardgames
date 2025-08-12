import type { Graph, NodeId } from 'ngraph.graph'
import downloadGroupGraph, { buildLocalNeighborsGraphForGroup } from './downloadGroupGraph'
import { createMaplibreSubgraphViewer } from './createMaplibreSubgraphViewer'
import type { BoardGameLinkData, BoardGameNodeData } from './fetchAndProcessGraph'
import { parse } from 'vue/compiler-sfc'

// Static reference to maintain single instance
let activeSubgraphViewer = undefined
export interface Repositories {
  isExternal: boolean
  name: NodeId | undefined
  lngLat: [number, number]
  // isExternal: boolean
  id: number
  linkWeight: number
}
interface BoardGameNodeDataWithChildren {
  node: BoardGameNodeData
  children: BoardGameNodeDataWithChildren[]
}
export interface IFocusViewModel {
  currentLog: string
  logMessages: string[]
  goBackToDirectConnections(): unknown
  setLayout(arg0: boolean): unknown
  expandGraph(): unknown
  expandingGraph: boolean
  layoutRunning: boolean
  graphData: BoardGameNodeDataWithChildren | undefined
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
          label,
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

        neighbors.sort((a, b) => {
          if (a.isExternal && !b.isExternal) {
            return 1
          } else if (!a.isExternal && b.isExternal) {
            return -1
          } else {
            return 0
          }
        })

        this.repos = neighbors
      })
      .catch((err) => {
        this.loading = false
        console.error('Failed to initialize FocusViewModel:', err)
      })
  }
  expandingGraph: boolean
  layoutRunning: boolean
  graphData: BoardGameNodeDataWithChildren | undefined
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
      const repositoryName = this.name
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
      const graph = await buildLocalNeighborsGraphForGroup(groupId, repositoryName, depth, logCallback)
      logCallback('Graph data received, building tree view...')

      // Convert graph to tree view
      this.graphData = this.toTreeView(graph, repositoryName, depth)

      // Dispose existing viewer if any
      this.disposeSubgraphViewer()

      // Create the new subgraph viewer
      activeSubgraphViewer = createMaplibreSubgraphViewer({
        graph,
        nodeId: repositoryName,
        groupId,
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

  toTreeView(graph: Graph<BoardGameNodeData, BoardGameLinkData>, startNodeId: number, depth = 2): BoardGameNodeDataWithChildren {
    const rootGraphNode = graph.getNode(startNodeId)
    if (!rootGraphNode) {
      // Return a minimal tree structure if the start node isn't found
      return {
        node: { id: startNodeId, label: startNodeId.toString() + ' (not found)', isExternal: false, lnglat: [0, 0], max_players: '0', l: '', c: 0 },
        children: [],
      }
    }

    const rootNodeData = rootGraphNode.data

    // Helper function to recursively build the tree for children
    // parentNodeId: The ID of the node whose children are being fetched.
    // parentDepthInTree: The depth of parentNodeId in the tree (startNodeId is at 0).
    // path: Set of ancestor IDs in the current traversal path to avoid cycles.
    function getChildrenRecursive(parentNodeId: NodeId, parentDepthInTree: number, path: Set<number>): BoardGameNodeDataWithChildren[] {
      // If the parent node is already at the maximum allowed depth,
      // it cannot have any children displayed in the tree.
      if (parentDepthInTree >= depth) {
        return []
      }

      const childNodes: BoardGameNodeDataWithChildren[] = []
      graph.forEachLinkedNode(
        parentNodeId,
        (linkedGraphNode) => {
          // If the linked node is already in the current path, skip it to prevent cycles.
          if (path.has(parseInt(linkedGraphNode.id.toString(), 10))) {
            return
          }

          const childData = linkedGraphNode.data

          // Create a new path set for the recursive call, including the current child.
          const newPath = new Set(path)
          newPath.add(parseInt(linkedGraphNode.id.toString(), 10))

          // Recursively get children of the current linkedGraphNode.
          // Its depth in the tree will be parentDepthInTree + 1.
          const grandChildren = getChildrenRecursive(linkedGraphNode.id, parentDepthInTree + 1, newPath)

          childNodes.push({ node: childData, children: grandChildren })
        },
        false,
      )
      return childNodes
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
