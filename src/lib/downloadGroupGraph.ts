import type { Graph, Link, Node } from 'ngraph.graph'
import { fetchAndProcessGraph } from './fetchAndProcessGraph'
import type { BoardGameNodeData, BoardGameLinkData } from './fetchAndProcessGraph'
const graphsCache = new Map()
const pendingRequests = new Map()

export default async function downloadGroupGraph(
  groupId: number,
  progressCallback?: (progress: { fileName: string; bytesReceived: number; totalBytes: number }) => void,
): Promise<Graph<BoardGameNodeData, BoardGameLinkData>> {
  if (graphsCache.has(groupId)) {
    return graphsCache.get(groupId)
  }

  // Prevent duplicate network requests by returning the in-flight promise
  if (pendingRequests.has(groupId)) {
    return pendingRequests.get(groupId)
  }

  const promise = fetchAndProcessGraph(groupId, progressCallback)
  pendingRequests.set(groupId, promise)

  try {
    const graph = await promise
    graphsCache.set(groupId, graph)
    return graph
  } finally {
    // Always clean up to prevent memory leaks, even on errors
    pendingRequests.delete(groupId)
  }
}

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)).toString() + ' ' + sizes[i]
}

export async function buildLocalNeighborsGraphForGroup(
  groupId: number,
  repositoryName: string,
  depth: number,
  logCallback?: (message: string) => void,
) {
  const createGraph = await import('ngraph.graph')
  const localGraph: Graph<BoardGameNodeData, BoardGameLinkData> = createGraph.default()

  if (logCallback) logCallback(`Downloading network data for group ${groupId.toString()}...`)

  const startTime = performance.now()

  // Create a download progress tracker
  const downloadProgressCallback = (progress: { fileName: string; bytesReceived: number; totalBytes: number }) => {
    if (!logCallback) return

    const bytesReceived = progress.bytesReceived || 0
    const totalBytes = progress.totalBytes

    if (totalBytes) {
      const percentComplete = Math.round((bytesReceived / totalBytes) * 100)
      logCallback(`Downloading ${progress.fileName}: ${formatBytes(bytesReceived)} of ${formatBytes(totalBytes)} (${percentComplete.toString()}%)`)
    } else {
      logCallback(`Downloading ${progress.fileName}: ${formatBytes(bytesReceived)} received`)
    }
  }

  // Fetch the initial group's graph with progress tracking
  let rootGraph: Graph<BoardGameNodeData, BoardGameLinkData> | undefined
  try {
    rootGraph = await downloadGroupGraph(groupId, downloadProgressCallback)

    if (logCallback) {
      logCallback(`Graph loaded: ${rootGraph.getNodesCount().toString()} nodes, ${rootGraph.getLinksCount().toString()} links`)
    }
  } catch (error: unknown) {
    if (logCallback) logCallback(`Error downloading group data: ${(error as Error).message}`)
    throw error
  }

  const downloadTime = Math.round(performance.now() - startTime)
  if (logCallback) logCallback(`Download complete in ${downloadTime.toString()}ms. Building network graph...`)

  // Track visited nodes to avoid duplicates
  const visited = new Set()
  // Queue for BFS traversal with node id, source group, and current depth
  const queue = []

  // Get the starting node
  const startNode = rootGraph.getNode(repositoryName)
  if (!startNode) {
    if (logCallback) logCallback(`Error: Repository "${repositoryName.toString()}" not found in group ${groupId.toString()}`)
    throw new Error(`Repository "${repositoryName.toString()}" not found in group ${groupId.toString()}`)
  }

  if (logCallback) logCallback(`Root node "${repositoryName.toString()}" found. Starting graph exploration...`)

  // Add starting node to local graph and queue
  localGraph.addNode(startNode.id, { ...startNode.data })
  queue.push({ nodeId: startNode.id, groupId, currentDepth: 0 })
  visited.add(startNode.id)

  // Stats tracking
  let processedNodes = 0
  let totalLinks = 0
  const externalGroups = new Set()

  // BFS traversal up to specified depth
  while (queue.length > 0) {
    const item = queue.shift()
    if (!item) continue
    const { nodeId, groupId: currentGroupId, currentDepth } = item

    if (currentDepth >= depth) continue

    processedNodes++

    // Get the graph for the current group
    let currentGraph
    if (currentGroupId !== groupId) {
      if (logCallback) {
        logCallback(`Loading external group: ${currentGroupId.toString()} (external group)`)
      }
      currentGraph = await downloadGroupGraph(currentGroupId, downloadProgressCallback)
      externalGroups.add(currentGroupId)
    } else {
      currentGraph = rootGraph
    }

    let linksAdded = 0

    // Process all neighbors of the current node
    currentGraph.forEachLinkedNode(
      nodeId,
      (neighborNode: Node, link: Link) => {
        // Add the edge to the local graph
        if (!localGraph.hasLink(link.fromId, link.toId) && !localGraph.hasLink(link.toId, link.fromId)) {
          localGraph.addLink(link.fromId, link.toId, { ...link.data })
          linksAdded++
          totalLinks++
        }

        // Skip already visited nodes
        if (visited.has(neighborNode.id)) return

        // Add the neighbor node to the local graph
        localGraph.addNode(neighborNode.id, { ...neighborNode.data })
        visited.add(neighborNode.id)

        // Add neighbor to queue with its group and incremented depth
        const neighborGroupId = neighborNode.data.c
        queue.push({
          nodeId: neighborNode.id,
          groupId: neighborGroupId,
          currentDepth: currentDepth + 1,
        })
      },
      false,
    )

    if (logCallback && (processedNodes % 10 === 0 || linksAdded > 20)) {
      logCallback(
        `Processed ${processedNodes.toString()} nodes, discovered ${visited.size.toString()} nodes, ${totalLinks.toString()} connections. Queue size: ${queue.length.toString()}`,
      )
    }
  }

  if (logCallback) {
    const externalGroupText = externalGroups.size > 0 ? `, including ${externalGroups.size.toString()} external groups` : ''
    logCallback(`Graph construction complete. Total: ${visited.size.toString()} nodes, ${totalLinks.toString()} connections${externalGroupText}.`)
  }

  return localGraph
}
