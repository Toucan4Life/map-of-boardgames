import type { Graph, Node } from 'ngraph.graph'
import config from './config'

// Create a single shared worker instance for decompression and parsing
let decompressWorker: Worker | null = null
let workerId = 0

function getDecompressWorker(): Worker {
  if (!decompressWorker) {
    decompressWorker = new Worker(new URL('./decompress.worker.ts', import.meta.url), { type: 'module' })
  }
  return decompressWorker
}

async function decompressAndParseInWorker(
  data: Uint8Array,
  onProgress?: (status: 'decompressing' | 'parsing' | 'serializing') => void
): Promise<{ nodes: any[], links: any[] }> {
  const worker = getDecompressWorker()
  const id = workerId++

  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      if (e.data.id === id) {
        if (e.data.type === 'progress') {
          onProgress?.(e.data.status)
        } else if (e.data.type === 'complete') {
          worker.removeEventListener('message', handler)
          if (e.data.error) {
            reject(new Error(e.data.error))
          } else {
            resolve({ nodes: e.data.nodes, links: e.data.links })
          }
        }
      }
    }

    worker.addEventListener('message', handler)
    worker.postMessage({ data, id })
  })
}

export type BoardGameNodeData = {
  rating: string
  complexity: string
  size: string
  id: number
  label: string
  lnglat: [number, number]
  max_players: string
  pos: string
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
  processingCallback?: (status: 'downloading' | 'decompressing' | 'parsing' | 'serializing' | 'reconstructing') => void,
): Promise<Graph<BoardGameNodeData, BoardGameLinkData>> {
  processingCallback?.('downloading')
  const fileName = `${groupId.toString()}.gzip`
  const url = `${config.compressedGraphEndpoint}/${fileName}`

  let compressedData: Uint8Array

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
    const chunks: Uint8Array[] = []

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

    compressedData = chunksAll
  } else {
    // Standard fetch without progress
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch graph for group ${groupId.toString()}: ${response.status.toString()} ${response.statusText}`)
    }

    // Get the compressed data as ArrayBuffer
    const compressedBuffer = await response.arrayBuffer()
    compressedData = new Uint8Array(compressedBuffer)
  }

  // Decompress and parse in Web Worker (non-blocking)
  const { nodes, links } = await decompressAndParseInWorker(compressedData, processingCallback)

  // Reconstruct graph from serialized data on main thread
  processingCallback?.('reconstructing')
  const createGraph = await import('ngraph.graph')
  const graph: Graph<BoardGameNodeData, BoardGameLinkData> = createGraph.default()

  // Add all nodes
  for (const nodeData of nodes) {
    graph.addNode(nodeData.id, nodeData.data)
  }

  // Add all links
  for (const linkData of links) {
    graph.addLink(linkData.fromId, linkData.toId, linkData.data)
  }

  // Process node positions
  graph.forEachNode((node: Node<BoardGameNodeData>) => {
    node.data.lnglat = node.data.pos.split(',').map((x: string) => +x) as [number, number]
  })

  return graph
}
