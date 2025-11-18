import type { Graph, Node } from 'ngraph.graph'
import config from './config'
import pako from 'pako'

export type BoardGameNodeData = {
  rating: string
  complexity: string
  size: string
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
  s: string | undefined
}

export async function fetchAndProcessGraph(
  groupId: number,
  progressCallback?: (progress: { fileName: string; bytesReceived: number; totalBytes: number }) => void,
): Promise<Graph<BoardGameNodeData, BoardGameLinkData>> {
  const fileName = `${groupId.toString()}.gzip`
  const url = `${config.compressedGraphEndpoint}/${fileName}`

  let text

  if (progressCallback) {
    // Fetch with progress tracking
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch graph for group ${groupId.toString()}: ${response.status.toString()} ${response.statusText}`)
    }

    // Get content length if available
    const contentLength = response.headers.get('content-length')
    const totalBytes = contentLength !== null ? parseInt(contentLength, 10) : undefined

    // Create a reader from the response body
    if (!response.body) {
      throw new Error(`Response body is null`)
    }
    const reader = response.body.getReader()
    let bytesReceived = 0
    const chunks = []

    let done = false
    while (!done) {
      const result = await reader.read()
      done = result.done

      if (!done) {
        const value = result.value
        if (value) {
          chunks.push(value)
          bytesReceived += value.length
        }

        progressCallback({
          fileName,
          bytesReceived,
          totalBytes: totalBytes ?? 0,
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
    text = new TextDecoder('utf-8').decode(pako.inflate(chunksAll))
  } else {
    // Standard fetch without progress
    const response = await fetch(url)

    // Get the compressed data as ArrayBuffer
    const compressedBuffer = await response.arrayBuffer()
    const compressedBytes = new Uint8Array(compressedBuffer)

    // Decompress (lz4js expects Uint8Array input)
    const decompressedBytes = pako.inflate(compressedBytes)

    // If the decompressed data is text (UTF-8)
    const decoder = new TextDecoder('utf-8')
    text = decoder.decode(decompressedBytes)
  }

  const fromDot = await import('ngraph.fromdot')

  const graph: Graph<BoardGameNodeData, BoardGameLinkData> = fromDot.default(text)

  graph.forEachNode((node: Node<BoardGameNodeData>) => {
    node.data.lnglat = node.data.l.split(',').map((x: string) => +x) as [number, number]
    if (typeof node.data.c === 'string' && node.data.c === 'undefined') {
      // Nodes of external groups will have their groupId set in the `.data.c` property
      // However nodes that belong to current group will have this property set to undefined
      // We set it here to make sure we know which group the node belongs to
      node.data.c = groupId
    }
  })

  return graph
}
