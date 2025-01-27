// import createGraph from 'ngraph.graph';
import { Graph } from 'ngraph.graph'
import config from './config'

const graphsCache = new Map()

export default async function downloadGroupGraph(groupId: string | number): Promise<Graph> {
  if (graphsCache.has(groupId)) {
    return graphsCache.get(groupId)
  }
  // let graph = createGraph();
  //console.log("In downloadGroupGraph")
  const response = await fetch(`${config.graphsEndpoint}/${groupId}.dot`)
  const text = await response.text()

  const fromDot = await import('ngraph.fromdot')
  const graph: Graph = fromDot.default(text)
  graph.forEachNode((node) => {
    node.data.l = node.data.l.split(',').map((x: string | number) => +x)
  })
  // let nodeFetch = fetch(`${config.graphsEndpoint}/${groupId}.nodes.json`).then(r => r.json()).then(nodePositions => {
  //   let nodeId = 0;
  //   for (let i = 0; i < nodePositions.length; i += 2) {
  //     nodeId += 1;
  //     graph.addNode(nodeId, [nodePositions[i], nodePositions[i + 1]]);
  //   }
  // });
  // let linkFetch = fetch(`${config.graphsEndpoint}/${groupId}.links.bin`).then(r => r.arrayBuffer()).then(buffer => {
  //   // buffer is int32 array:
  //   let view = new Int32Array(buffer);
  //   let lastFrom = 0;
  //   for (let i = 0; i < view.length; i++) {
  //     let v = view[i];
  //     if (v < 0) {
  //       // new source node
  //       lastFrom = -v;
  //       continue;
  //     }
  //     graph.addLink(lastFrom, v);
  //   }
  // });
  // await Promise.all([nodeFetch, linkFetch]);
  graphsCache.set(groupId, graph)
  return graph
}
