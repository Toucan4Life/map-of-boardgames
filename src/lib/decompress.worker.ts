import * as pako from 'pako'
import type { Node, Link } from 'ngraph.graph'
import type { BoardGameNodeData, BoardGameLinkData } from './fetchAndProcessGraph'

self.onmessage = async (e: MessageEvent) => {
  const { data, id } = e.data

  try {
    // Progress: Decompressing
    self.postMessage({ id, type: 'progress', status: 'decompressing' })
    const decompressed = pako.inflate(data)
    const text = new TextDecoder('utf-8').decode(decompressed)

    // Progress: Parsing
    self.postMessage({ id, type: 'progress', status: 'parsing' })
    const fromDot = await import('ngraph.fromdot')
    const graph = fromDot.default<BoardGameNodeData, BoardGameLinkData>(text)

    // Progress: Serializing
    self.postMessage({ id, type: 'progress', status: 'serializing' })
    const nodes: { id: number; data: BoardGameNodeData }[] = []
    const links: { fromId: number; toId: number; data: BoardGameLinkData }[] = []

    graph.forEachNode((node: Node<BoardGameNodeData>) => {
      nodes.push({
        id: node.id as number,
        data: node.data
      })
    })

    graph.forEachLink((link: Link<BoardGameLinkData>) => {
      links.push({
        fromId: link.fromId as number,
        toId: link.toId as number,
        data: link.data
      })
    })

    self.postMessage({ id, type: 'complete', nodes, links, error: null })
  } catch (error) {
    self.postMessage({ id, type: 'complete', nodes: null, links: null, error: (error as Error).message })
  }
}
