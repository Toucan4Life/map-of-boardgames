import type { Graph } from 'ngraph.graph'
import config from './config'

const graphsCache = new Map()
export interface BoardgameData {
  id: number
  l: string
  lnglat: [number, number]
}
export class GraphDownloader {
  isCancelled: boolean
  constructor() {
    this.isCancelled = false
  }

  async downloadGroupGraph(groupId: number): Promise<Graph<BoardgameData, { weight: number }>> {
    if (graphsCache.has(groupId)) {
      return graphsCache.get(groupId)
    }
    const response = await fetch(`${config.graphsEndpoint}/${groupId.toString()}.dot`)
    const text = await response.text()

    const fromDot = await import('ngraph.fromdot')
    const graph: Graph<BoardgameData, { weight: number }> = fromDot.default(text)
    graph.forEachNode((node) => {
      node.data.lnglat = node.data.l.split(',').map((x: string) => +x) as [number, number]
    })
    graphsCache.set(groupId, graph)
    return graph
  }
  cancel() {
    this.isCancelled = true
  }
}
