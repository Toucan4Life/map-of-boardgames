import type { Graph } from 'ngraph.graph'
import { fetchAndProcessGraph } from './fetchAndProcessGraph'
import type { BoardGameNodeData, BoardGameLinkData } from './fetchAndProcessGraph'

export type GameGraph = Graph<BoardGameNodeData, BoardGameLinkData>

const graphsCache = new Map<number, GameGraph>()
const pendingRequests = new Map<number, Promise<GameGraph>>()

/** Downloads a single group's graph, caching the result and deduping concurrent in-flight requests for the same group. */
export default async function downloadGroupGraph(
  groupId: number,
  progressCallback?: (progress: { fileName: string; bytesReceived: number; totalBytes: number }) => void,
  processingCallback?: (status: 'downloading' | 'decompressing' | 'parsing' | 'serializing' | 'reconstructing') => void,
): Promise<GameGraph> {
  const cached = graphsCache.get(groupId)
  if (cached) return cached

  // Prevent duplicate network requests by returning the in-flight promise
  const pending = pendingRequests.get(groupId)
  if (pending) return pending

  const promise = fetchAndProcessGraph(groupId, progressCallback, processingCallback)
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
