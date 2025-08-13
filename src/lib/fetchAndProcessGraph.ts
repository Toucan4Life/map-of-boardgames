import type { Graph, Link, Node } from 'ngraph.graph'
import config from './config'

export type BoardGameNodeData = {
  id: number
  label: string
  lnglat: [number, number]
  max_players: string
  l: string
  c: number
  isExternal: boolean
}

export type BoardGameLinkData = {
  e: boolean
  weight: number
}

export async function fetchAndProcessGraph(
  groupId: number,
  progressCallback?: (progress: { fileName: string; bytesReceived: number; totalBytes: number }) => void,
) {
  const fileName = `${groupId.toString()}.dot`
  const url = `${config.graphsEndpoint}/${fileName}`

  let text

  if (progressCallback) {
    // Fetch with progress tracking
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch graph for group ${groupId}: ${response.status.toString()} ${response.statusText}`)
    }

    // Get content length if available
    const contentLength = response.headers.get('content-length')
    const totalBytes = contentLength !== null ? parseInt(contentLength, 10) : undefined

    // Create a reader from the response body
    const reader = response.body.getReader()
    let bytesReceived = 0
    const chunks = []

    let done = false
    while (!done) {
      const result = await reader.read()
      done = result.done

      if (!done) {
        const value = result.value
        chunks.push(value)
        bytesReceived += value.length

        progressCallback({
          fileName,
          bytesReceived,
          totalBytes,
        })
      }
    }

    // Combine all chunks into a single array
    const chunksAll = new Uint8Array(bytesReceived)
    let position = 0
    for (const chunk of chunks) {
      chunksAll.set(chunk, position)
      position += chunk.length
    }

    // Convert to text
    text = new TextDecoder('utf-8').decode(chunksAll)
  } else {
    // Standard fetch without progress
    const response = await fetch(url)
    text = await response.text()
  }

  const fromDot = await import('ngraph.fromdot')

  const graph: Graph<BoardGameNodeData, BoardGameLinkData> = fromDot.default(text)

  graph.forEachNode((node: Node<BoardGameNodeData>) => {
    node.data.lnglat = node.data.l.split(',').map((x: string) => +x) as [number, number]
    if (node.data.c === undefined) {
      // Nodes of external groups will have their groupId set in the `.data.c` property
      // However nodes that belong to current group will have this property set to undefined
      // We set it here to make sure we know which group the node belongs to
      node.data.c = groupId
    }
  })

  return graph
}
