import pako from 'pako'

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
    const graph = fromDot.default(text)

    // Progress: Serializing
    self.postMessage({ id, type: 'progress', status: 'serializing' })
    const nodes: any[] = []
    const links: any[] = []

    graph.forEachNode((node: any) => {
      nodes.push({
        id: node.id,
        data: node.data
      })
    })

    graph.forEachLink((link: any) => {
      links.push({
        fromId: link.fromId,
        toId: link.toId,
        data: link.data
      })
    })

    self.postMessage({ id, type: 'complete', nodes, links, error: null })
  } catch (error) {
    self.postMessage({ id, type: 'complete', nodes: null, links: null, error: (error as Error).message })
  }
}
